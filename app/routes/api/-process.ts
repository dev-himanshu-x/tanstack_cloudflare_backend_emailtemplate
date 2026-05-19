import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import { records, uploads } from "../../db/schema";
import type { CloudflareEnv } from "../../utils/cloudflare";

type CsvRecordRow = {
	csvId: number;
	Name: string;
	dial_code: number;
	phone_number: number;
};

const BATCH_SIZE = 200;
const PROGRESS_INTERVAL = 5000;

const normalizeHeader = (value: string): string =>
	value.trim().toLowerCase().replace(/\s+/g, "_");

const parseCsvLine = (line: string): string[] => {
	const fields: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i += 1) {
		const char = line[i];

		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i += 1;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}

		if (char === "," && !inQuotes) {
			fields.push(current.trim());
			current = "";
			continue;
		}

		current += char;
	}

	fields.push(current.trim());
	return fields;
};

const streamLines = async function* (
	stream: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { value, done } = await reader.read();
		if (done) {
			break;
		}

		buffer += decoder.decode(value, { stream: true });
		let index = buffer.indexOf("\n");

		while (index >= 0) {
			let line = buffer.slice(0, index);
			if (line.endsWith("\r")) {
				line = line.slice(0, -1);
			}
			yield line;
			buffer = buffer.slice(index + 1);
			index = buffer.indexOf("\n");
		}
	}

	buffer += decoder.decode();
	if (buffer.length > 0) {
		yield buffer;
	}
};

export const processCsv = async (
	uploadId: number,
	r2Key: string,
	db: DrizzleD1Database<typeof schema>,
	env: CloudflareEnv
): Promise<void> => {
	let processedRows = 0;

	const updateStatus = async (
		status: "processing" | "processed" | "failed",
		progress: number
	) => {
		await db
			.update(uploads)
			.set({ status, progress })
			.where(eq(uploads.id, uploadId));
	};

	try {
		await updateStatus("processing", 0);

		const object = await env.MY_BUCKET.get(r2Key);

		if (!object?.body) {
			throw new Error("CSV object not found in storage");
		}

		let headerMap: Record<string, number> | null = null;
		const batch: CsvRecordRow[] = [];

		for await (const line of streamLines(object.body)) {
			if (!line) {
				continue;
			}

			if (!headerMap) {
				const headers = parseCsvLine(line).map(normalizeHeader);
				headerMap = Object.fromEntries(
					headers.map((value, index) => [value, index])
				);

				const required = ["name", "dial_code", "phone_number"];
				for (const field of required) {
					if (!(field in headerMap)) {
						throw new Error(`Missing required column: ${field}`);
					}
				}
				continue;
			}

			const values = parseCsvLine(line);
			const name = values[headerMap.name] ?? "";
			const dialCode = Number.parseInt(values[headerMap.dial_code] ?? "", 10);
			const phoneNumber = Number.parseInt(
				values[headerMap.phone_number] ?? "",
				10
			);

			if (!name || Number.isNaN(dialCode) || Number.isNaN(phoneNumber)) {
				continue;
			}

			batch.push({
				csvId: uploadId,
				Name: name,
				dial_code: dialCode,
				phone_number: phoneNumber,
			});

			if (batch.length >= BATCH_SIZE) {
				await db.insert(records).values(batch);
				processedRows += batch.length;
				batch.length = 0;

				if (processedRows % PROGRESS_INTERVAL === 0) {
					await updateStatus("processing", processedRows);
				}
			}
		}

		if (batch.length > 0) {
			await db.insert(records).values(batch);
			processedRows += batch.length;
		}

		await updateStatus("processed", processedRows);
	} catch (error) {
		console.error("CSV processing failed:", error);
		await updateStatus("failed", processedRows);
		throw error;
	}
};

