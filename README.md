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
- Each event registers people by WhatsApp, an outside link, or **our own form**: the admin builds the
  questions, sets the fee (and an optional member fee), and confirms paid registrations in the
  event's Registrations page, which also downloads as a spreadsheet. Free registrations confirm at once.
- Events marked _Published_ appear on `/events`; the next three upcoming ones also appear on the home page.
  Event times are entered and shown in India time.

## Membership

- **Applying:** `/join` shows the fee and the UPI QR and ID set in Admin → Membership & payment.
  Applicants pay, then submit their details with the UPI transaction ID (UTR).
- **Approving:** Admin → Applications. Approving creates the member's login with a temporary
  password and emails it. Without email set up, the admin is shown the login to share by hand.
- **Members (`/member`):** choose a password on first sign-in, then:
  - Profile and directory.
  - **Connects:** leads passed to another member.
  - **Transactions:** business done between members. The other member confirms it, and it
    confirms itself after 7 days.
  - **Membership:** status and UPI renewals, verified in Admin → Payments.
- **Email:** set `RESEND_API_KEY` and `EMAIL_FROM` (a domain verified at resend.com). Both are optional.

## Schema changes

Edit `src/lib/server/db/schema.ts`, then run `npm run db:push` against each database (local and Neon).

## Scroll story

The home page video is built from the Higgsfield clips:

```sh
scripts/frames.sh story/clips 200   # also runs scripts/keyframes.py for the sharp chapter stills
```
