import { integer, sqliteTable ,text } from "drizzle-orm/sqlite-core";

type Data = {
	name: string;
	hostel_name: string;
    floor:number;
    seater:number;
    room_number:number;
};

export const records = sqliteTable('csv_records', {
  id: integer().primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(),
  data: text('data', { mode: 'json' }).$type<Data>().notNull(),
});