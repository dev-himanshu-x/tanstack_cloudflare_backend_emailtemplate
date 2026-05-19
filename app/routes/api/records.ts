import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import { records, uploads } from "../../db/schema";
import { resolveCloudflareEnv } from "../../utils/cloudflare";

export const Route = createFileRoute("/api/records")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        const url = new URL(request.url);
        const idParam = url.searchParams.get("id");
        const limitParam = url.searchParams.get("limit");
        const offsetParam = url.searchParams.get("offset");
        const uploadId = Number(idParam);

        if (!idParam || Number.isNaN(uploadId)) {
          return Response.json({ error: "Missing or invalid id" }, { status: 400 });
        }

        const cloudflareEnv = resolveCloudflareEnv(context, request);

        if (!cloudflareEnv?.DB) {
          return Response.json(
            { error: "DB binding not available" },
            { status: 500 }
          );
        }

        const db = drizzle(cloudflareEnv.DB, { schema });

        const limit = Math.min(
          Math.max(Number.parseInt(limitParam ?? "", 10) || 1000, 1),
          5000
        );
        const offset = Math.max(Number.parseInt(offsetParam ?? "", 10) || 0, 0);

        const [upload] = await db
          .select({ status: uploads.status })
          .from(uploads)
          .where(eq(uploads.id, uploadId))
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
            Name: records.Name,
            dial_code: records.dial_code,
            phone_number: records.phone_number,
          })
          .from(records)
          .where(eq(records.csvId, uploadId))
          .orderBy(records.id)
          .limit(limit)
          .offset(offset);

        return Response.json(
          {
            uploadId,
            count: rows.length,
            limit,
            offset,
            nextOffset: rows.length === limit ? offset + limit : null,
            records: rows,
          },
          { status: 200 }
        );
      },
    },
  },
});
