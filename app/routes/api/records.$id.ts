import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../index'
import { records } from '../../db/schema'
import { eq } from 'drizzle-orm'

export const Route = createFileRoute('/api/records/$id')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const csvId = Number(params.id);
        const results = await db
          .select()
          .from(records)
          .where(eq(records.csvId, csvId))
        return Response.json({
          csvId,
          count: results.length,
          data: results,
        });
      }
    }
  }
})