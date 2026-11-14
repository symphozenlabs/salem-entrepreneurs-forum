# Three forums, one site — plan

Decisions (Nov 2026): **subdomains**, **fully shared membership**, **popup on first visit only**.

| Forum | Short | Subdomain | Story |
|---|---|---|---|
| Salem Entrepreneurs Forum | SEF | `salem.<domain>` | `story/STORYBOARD.md` (done) |
| Coimbatore Entrepreneurs Forum | CEF | `coimbatore.<domain>` | `story/coimbatore/STORYBOARD.md` |
| Tamil Nadu Entrepreneurs Forum | TNEF | `tamilnadu.<domain>` | `story/tamilnadu/STORYBOARD.md` |

`<domain>` must be a custom domain: `*.vercel.app` addresses can't have their own subdomains.

## How a visit works

1. `<domain>` (the bare domain) shows the **forum-selection popup** over a neutral preloader.
   The choice is saved in a cookie on `.<domain>`, and the visitor is sent to that subdomain.
   Later visits to the bare domain go straight to the saved forum.
2. A direct link to a subdomain skips the popup and remembers that forum.
3. A **fixed top-left forum switcher** (logo + dropdown) on every public page switches to another
   forum's subdomain and updates the saved choice.

## Code changes

- **Forum registry** `src/lib/forums.ts`: one entry per forum holding its brand, contact details,
  stats, industries, reasons, chapters, story manifest path and logo. `content.ts` becomes the Salem entry.
- **`hooks.server.ts`** reads the forum from the host name (`event.locals.forum`); localhost uses
  `?forum=` or the cookie so all three can be tested locally.
- **Story assets** move to `static/story/<forum>/…`; `frames.sh` and `keyframes.py` take the forum as an argument.
- **Shared sign-in across subdomains**: Better Auth `crossSubDomainCookies` on `.<domain>`, with
  each subdomain added to `trustedOrigins`. Admin and member areas work from any subdomain.
- **Database** (one Neon database, as decided): add a `forum` column to `event`,
  `contact_message` and `membership_application` (where they applied), plus a `home_forum` on member profiles.
  Membership fee, UPI and the member directory stay shared. Existing rows are set to `salem`.
- **Admin**: forum filter on events, enquiries and applications; choose the forum when creating an event.
- **SEO**: per-forum title, description, social-preview image (its K1 still), canonical address and a
  `sitemap.xml` per subdomain.

## Content still needed from you

- The custom domain, and DNS access to add the subdomains in Vercel.
- CEF and TNEF logos (or approval to make text-based ones in the same style as SEF's).
- Contact address, phone, WhatsApp and email for each forum (or the same for all).
- Real stats for each forum (founders, referral ₹ Cr, events held, retention).
- The 12 keyframe images (prompts in each storyboard), then the 12 clips.
