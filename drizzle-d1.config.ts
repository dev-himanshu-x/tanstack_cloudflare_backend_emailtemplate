import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './app/db/schema.ts',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: '4ba232aa7c49608b66cadc2b546ffa92',
    databaseId: 'ee6ee420-5730-4be7-a258-52cc29fb54ea',
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
});
