import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../index'
import { uploads } from '../../db/schema'
import { eq } from 'drizzle-orm'

export const Route = createFileRoute('/api/progress/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = parseInt(params.id);
        const result = await db.select().from(uploads).where(eq(uploads.id, id)).get();
        
        if (!result) return Response.json({ error: "Not found" }, { status: 404 });
        
        return Response.json({
          status: result.status,
          progress: result.progress
        });
      }
    }
  }
})