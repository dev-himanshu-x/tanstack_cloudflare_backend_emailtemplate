import { drizzle } from 'drizzle-orm/d1';
import { records, uploads } from '../../db/schema';
import { eq } from 'drizzle-orm';
import Papa from 'papaparse';
import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { db } from '../../index';

// Core processing logic shared by both Queue and API
async function processUpload(uploadId: number, r2Key: string | undefined) {
  if (!r2Key) return { error: "No R2 key provided" };

  await db.update(uploads).set({ status: 'processing' }).where(eq(uploads.id, uploadId));
  
  const object = await env.MY_BUCKET.get(r2Key);
  if (!object || !object.body) return { error: "File not found in R2" };

  let chunk: any[] = [];
  let totalProcessed = 0;
  const csvText = await object.text();

  await new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      step: async (results, parser) => {
        const row = results.data as any;
        chunk.push({
          csvId: uploadId,
          email: row.email, 
          data: row,
        });

        if (chunk.length >= 500) {
          parser.pause();
          try {
            await db.insert(records).values(chunk);
            totalProcessed += chunk.length;
            await db.update(uploads).set({ progress: 50 }).where(eq(uploads.id, uploadId));
            chunk = [];
            parser.resume();
          } catch (err) {
            parser.abort();
            reject(err);
          }
        }
      },
      complete: resolve,
      error: reject,
    });
  });

  if (chunk.length > 0) await db.insert(records).values(chunk);
  await db.update(uploads).set({ status: 'processed', progress: 100 }).where(eq(uploads.id, uploadId));
  
  return { success: true, processed: totalProcessed + chunk.length };
}

// 1. Manual Trigger Route: POST /api/process/18
export const Route = createFileRoute('/api/process/$id')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const uploadId = parseInt(params.id);
        const upload = await db.select().from(uploads).where(eq(uploads.id, uploadId)).get();
        const result = await processUpload(uploadId, upload?.r2Key);
        return Response.json(result);
      }
    }
  }
})

// 2. Automatic Queue Consumer (Production)
export default {
  async queue(batch: MessageBatch<any>) {
    for (const message of batch.messages) {
      await processUpload(message.body.uploadId, message.body.r2Key);
    }
  },
};