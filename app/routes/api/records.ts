import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { records, uploads } from "../../db/schema";
import { db } from "../../index";

export const Route = createFileRoute("/api/records")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = Number(url.searchParams.get("id"));

        if (!id || Number.isNaN(id)) {
          return Response.json({ error: "Missing or invalid ?id=" }, { status: 400 });
        }

        const [upload] = await db
          .select({ status: uploads.status })
          .from(uploads)
          .where(eq(uploads.id, id))
          .limit(1);

        if (!upload) {
          return Response.json({ error: "Upload not found" }, { status: 404 });
        }

        if (upload.status !== "processed") {
          return Response.json(
            { error: "Upload not yet processed", status: upload.status },
            { status: 202 }
          );
        }

        const rows = await db
          .select({
            id: records.id,
            email: records.email,
            data: records.data,
          })
          .from(records)
          .where(eq(records.csvId, id));

        return Response.json({ uploadId: id, count: rows.length, records: rows }, { status: 200 });
      },
    },
  },
});
