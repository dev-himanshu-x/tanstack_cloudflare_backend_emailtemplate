import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import { uploads } from "../../db/schema";
import { resolveCloudflareEnv } from "../../utils/cloudflare";

export const Route = createFileRoute("/api/progress")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        const url = new URL(request.url);
        const idParam = url.searchParams.get("id");
        const uploadId = Number(idParam);

        if (!idParam || Number.isNaN(uploadId)) {
          return Response.json(
            { error: "Missing or invalid id" },
            { status: 400 }
          );
        }

        const cloudflareEnv = resolveCloudflareEnv(context, request);

        const d1Database = cloudflareEnv?.DB;
        if (!d1Database) {
          return Response.json(
            { error: "DB binding not available" },
            { status: 500 }
          );
        }

        const activeDb = drizzle(d1Database, { schema });

        const STATUS_MESSAGES: Record<string, string> = {
          pending: "Upload received, waiting to process…",
          processing: "Processing data…",
          processed: "Processing complete",
          failed: "Processing failed",
        };

        const TERMINAL_STATUSES = new Set(["processed", "failed"]);

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        const sendEvent = async (data: object) => {
          const payload = `data: ${JSON.stringify(data)}\n\n`;
          await writer.write(encoder.encode(payload));
        };

        const poll = async () => {
          try {
            while (true) {
              const [upload] = await activeDb
                .select({
                  id: uploads.id,
                  status: uploads.status,
                  progress: uploads.progress,
                })
                .from(uploads)
                .where(eq(uploads.id, uploadId))
                .limit(1);

              if (!upload) {
                await sendEvent({ error: "Upload not found" });
                break;
              }

              const progress = upload.progress ?? 0;
              const status = upload.status ?? "";
              const baseMessage =
                STATUS_MESSAGES[status] ?? (status || "unknown");
              const message =
                status === "processing"
                  ? `${baseMessage} (${progress} rows)`
                  : status === "processed"
                    ? `${baseMessage} (${progress} rows)`
                    : baseMessage;

              await sendEvent({
                id: upload.id,
                status,
                progress,
                message,
              });

              if (TERMINAL_STATUSES.has(upload.status ?? "")) {
                break;
              }

              await new Promise((r) => setTimeout(r, 1000));
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            await sendEvent({ error: message });
          } finally {
            await writer.close();
          }
        };

        poll();

        return new Response(readable, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
