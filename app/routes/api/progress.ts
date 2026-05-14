import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { uploads } from "../../db/schema";
import { db } from "../../index";

export const Route = createFileRoute("/api/progress")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = Number(url.searchParams.get("id"));

        if (!id || Number.isNaN(id)) {
          return Response.json({ error: "Missing or invalid ?id=" }, { status: 400 });
        }

        const [upload] = await db
          .select({
            id: uploads.id,
            status: uploads.status,
            progress: uploads.progress,
          })
          .from(uploads)
          .where(eq(uploads.id, id))
          .limit(1);

        if (!upload) {
          return Response.json({ error: "Upload not found" }, { status: 404 });
        }

        return Response.json(upload, { status: 200 });
      },
    },
  },
});
