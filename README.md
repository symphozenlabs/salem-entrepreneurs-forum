# Salem Entrepreneurs Forum

The forum's website and admin: SvelteKit on Vercel, Neon Postgres via Drizzle, Better Auth for sign-in.

## Develop

```sh
npm install
cp .env.example .env   # then fill it in, see below
npm run db:push        # create or update the tables
npm run dev
```

`DATABASE_URL` can point at Neon, or at an embedded local database so you never touch real data:

```sh
DATABASE_URL="pglite:./.pglite"
```

The local database is development-only; production builds always use Neon.

## Environment variables

| Name                 | What                                                                         |
| -------------------- | ---------------------------------------------------------------------------- |
| `DATABASE_URL`       | Neon connection string (`postgres://…`), or `pglite:./.pglite` locally       |
| `ORIGIN`             | The site's address, e.g. `https://salem-entrepreneurs-forum.vercel.app`      |
| `BETTER_AUTH_SECRET` | 32+ random characters (`npx auth secret`). Also the one-time admin setup key |

## Admin

`/admin` — events, contact-form enquiries, and admin accounts.

- **First admin:** open `/admin/setup`, enter `BETTER_AUTH_SECRET` as the setup key, and choose your login.
  The page only works while no admin exists.
- **More admins:** Admins & account → Add an admin.
- Events marked _Published_ appear on `/events`; the next three upcoming ones also appear on the home page.
  Event times are entered and shown in India time.

## Schema changes

Edit `src/lib/server/db/schema.ts`, then run `npm run db:push` against each database (local and Neon).

## Scroll story

The home page video is built from the Higgsfield clips:

```sh
scripts/frames.sh story/clips 200   # also runs scripts/keyframes.py for the sharp chapter stills
```
