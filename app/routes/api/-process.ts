import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import Papa from "papaparse";
import { uploads, records } from "../../db/schema";
import { db } from "../../index";

type CsvRow = {
  Email?: string;
  email?: string;
  Name?: string;
  name?: string;
  hostel_name?: string;
  floor?: string | number;
  Seater?: string | number;
  seater?: string | number;
  room_number?: string | number;
};

type RecordInsert = typeof records.$inferInsert;

const BATCH_SIZE = 100;

export async function processCsv(uploadId: number, r2Key: string) {
  try {
    await db.update(uploads).set({ status: "processing" }).where(eq(uploads.id, uploadId));

    const object = await env.MY_BUCKET.get(r2Key);
    if (!object) throw new Error(`File not found in R2: ${r2Key}`);

    const text = await object.text();
    const parsedRows: RecordInsert[] = [];

    const parseResult = Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      console.warn("CSV parse warnings:", parseResult.errors.slice(0, 5));
    }

    for (const row of parseResult.data) {
      const email = row.Email ?? row.email;
      if (!email) continue;

      parsedRows.push({
        csvId: uploadId,
        email,
        data: {
          name: row.Name ?? row.name ?? "",
          hostel_name: row.hostel_name ?? "",
          floor: Number(row.floor ?? 0),
          seater: Number(row.Seater ?? row.seater ?? 0),
          room_number: Number(row.room_number ?? 0),
        },
      });
    }

    const total = parsedRows.length;
    console.log(`Parsed ${total} rows from CSV, starting D1 inserts…`);

    const stmt = env.DB.prepare(
      "INSERT INTO csv_records (csv_id, email, data) VALUES (?, ?, ?)"
    );

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const chunk = parsedRows.slice(i, i + BATCH_SIZE);
      await env.DB.batch(
        chunk.map((r) => stmt.bind(r.csvId, r.email, JSON.stringify(r.data)))
      );

      if (i % 1000 === 0 && i > 0) {
        const progress = Math.min(Math.floor((i / total) * 100), 99);
        await db.update(uploads).set({ progress }).where(eq(uploads.id, uploadId));
      }
    }

    await db.update(uploads).set({ status: "processed", progress: 100 }).where(eq(uploads.id, uploadId));
    console.log(` Done: ${total} records inserted for upload ${uploadId}`);

  } catch (error) {
    console.error(" Processing error:", error);
    await db.update(uploads).set({ status: "failed" }).where(eq(uploads.id, uploadId));
  }
}