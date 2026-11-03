import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

// `pglite:<dir>` is the embedded local-development database (see src/lib/server/db/index.ts).
const local = url.startsWith('pglite:');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	...(local
		? { driver: 'pglite', dbCredentials: { url: url.slice('pglite:'.length) } }
		: { dbCredentials: { url } }),
	verbose: true,
	strict: true
});
