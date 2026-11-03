import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { dev } from '$app/env';
import { DATABASE_URL } from '$app/env/private';

type Db = NeonHttpDatabase<typeof schema>;

let client: Db | undefined;

// Local development can run on an embedded Postgres instead of Neon:
// DATABASE_URL=pglite:./.pglite  (stripped from production builds via `dev`).
if (dev && DATABASE_URL?.startsWith('pglite:')) {
	const { PGlite } = await import('@electric-sql/pglite');
	const { drizzle: drizzleLite } = await import('drizzle-orm/pglite');
	const g = globalThis as { __pglite?: InstanceType<typeof PGlite> };
	g.__pglite ??= new PGlite(DATABASE_URL.slice('pglite:'.length));
	client = drizzleLite(g.__pglite, { schema }) as unknown as Db;
}

function connect(): Db {
	if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
	return (client ??= drizzle(neon(DATABASE_URL), { schema }));
}

// Connects on first use, so pages that never query the database still render
// when DATABASE_URL isn't configured (e.g. a fresh Vercel deployment).
export const db = new Proxy({} as Db, {
	get(_, prop) {
		const real = connect();
		const value = Reflect.get(real, prop);
		return typeof value === 'function' ? value.bind(real) : value;
	}
});
