import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { uploads } from "../../db/schema";
import { db } from "../../index";
import { processCsv } from "./-process";

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const file = formData.get("file") as File;

          if (!file) {
            return Response.json({ error: "No file provided" }, { status: 400 });
          }

          if (!file.name.endsWith(".csv")) {
            return Response.json({ error: "Only CSV files are supported" }, { status: 400 });
          }

          const r2Key = `csv-${Date.now()}-${file.name}`;

          await env.MY_BUCKET.put(r2Key, file.stream(), {
            httpMetadata: { contentType: file.type || "text/csv" },
          });

          const [newUpload] = await db
            .insert(uploads)
            .values({
              r2Key,
              status: "pending",
              progress: 0,
            })
            .returning();

          await processCsv(newUpload.id, r2Key);

          return Response.json({ id: newUpload.id }, { status: 200 });
        } catch (err) {
          console.error("Upload error:", err);
          return Response.json({ error: "Upload failed" }, { status: 500 });
        }
      },
    },
  },
});