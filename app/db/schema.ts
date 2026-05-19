import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";


export const uploads = sqliteTable('csv_uploads',{
    id: integer("id").primaryKey({ autoIncrement: true }),
    r2Key:text("r2_key").notNull(),
    status: text("status").$type<'pending' | 'processing' | 'processed' | 'failed'>().default('pending'),
    progress: integer("progress").default(0),
})


export const records = sqliteTable('csv_records', {
  id: integer("id").primaryKey({ autoIncrement: true }),
  csvId: integer("csv_id").notNull().references(()=> uploads.id),
  Name:text("Name").notNull(),
  dial_code: integer("dial_code").notNull(),
  phone_number:integer("phone_number").notNull()
  //data: text("data", { mode: 'json' }).$type<Data>().notNull(),
});


export const uploadsRelations = relations(uploads, ({ many }) => ({
  records: many(records),
})); 

export const recordsRelations = relations(records, ({ one }) => ({
  upload: one(uploads, {
    fields: [records.csvId],
    references: [uploads.id],
  }),
}));
