import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../index'
import { uploads } from '../../db/schema'
import { env } from 'cloudflare:workers'

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const file = formData.get('file') as File;
          const r2Key = `${Date.now()}-${file.name}`;
          
          await env.MY_BUCKET.put(r2Key, file.stream());
          
          const [newUpload] = await db.insert(uploads).values({
            r2Key,
            status: 'pending',
            progress: 0,
          }).returning();

          if (env.CSV_QUEUE) {
            await env.CSV_QUEUE.send({
              uploadId: newUpload.id,
              r2Key: r2Key
            });
          }

          return Response.json({ id: newUpload.id });
        } catch (err) {
          return Response.json({ error: "Upload failed" }, { status: 500 });
        }
      }
    }
  }
})