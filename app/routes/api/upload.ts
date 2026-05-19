import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import { uploads } from "../../db/schema";
import { resolveCloudflareEnv, resolveWaitUntil } from "../../utils/cloudflare";
import { processCsv } from "./-process";

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        try {
          const errorResponse = (status: number, error: string, details?: string) =>
            Response.json(
              details ? { error, details } : { error },
              { status }
            );

          const cloudflareEnv = resolveCloudflareEnv(context, request);

          if (!cloudflareEnv) {
            return errorResponse(
              500,
              "Upload failed",
              "Cloudflare bindings are missing from request context"
            );
          }

          const myBucket = cloudflareEnv.MY_BUCKET;
          const d1Database = cloudflareEnv.DB;

          if (!myBucket || !d1Database) {
            return errorResponse(
              500,
              "Upload failed",
              "Storage or database bindings are missing"
            );
          }

          const db = drizzle(d1Database, { schema });

          const formData = await request.formData();
          const file = formData.get("file") as File | null;

          if (!file) {
            return errorResponse(400, "No file provided");
          }

          if (!file.name.endsWith(".csv")) {
            return errorResponse(400, "Only CSV files are supported");
          }

          const r2Key = `${Date.now()}-${file.name}`;

          await myBucket.put(r2Key, file.stream(), {
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

          const processing = processCsv(newUpload.id, r2Key, db, cloudflareEnv).catch(
            (error) => {
              console.error("Processing error:", error);
            }
          );

          const waitUntil = resolveWaitUntil(context, request);

          if (waitUntil) {
            waitUntil(processing);
            return Response.json({ id: newUpload.id, status: "pending" }, { status: 200 });
          }

          await processing;

          const [upload] = await db
            .select({ status: uploads.status, progress: uploads.progress })
            .from(uploads)
            .where(eq(uploads.id, newUpload.id))
            .limit(1);

          return Response.json(
            {
              id: newUpload.id,
              status: upload?.status ?? "processed",
              progress: upload?.progress ?? 0,
            },
            { status: 200 }
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("Upload error:", err);
          return Response.json({ error: "Upload failed", details: message }, { status: 500 });
        }
      },
    },
  },
});
