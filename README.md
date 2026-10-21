# DeshConnect — Bangladesh Community & Information Platform

DeshConnect is a modular Next.js (App Router) + TypeScript platform that brings tourism, education,
healthcare, businesses, government services, blood donation, news and community participation into one
searchable website, organised from **division → district → upazila**.

This project implements the full route inventory, shared UI, authentication, account tools, moderation
and administration described in the project requirements document.

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, React 19) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Validation | Zod |
| Authentication | InsForge Auth (email/password, verification codes, Google OAuth) |
| User-owned records | InsForge Postgres with per-user RLS |
| Public directory content | Existing local content/data services |
| Tests | Vitest |

---

## Getting started

```bash
npm install          # or: node node_modules/next/dist/bin/next ...
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Start the production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the Vitest suite |

> On Windows PowerShell, `npm.ps1` may be blocked by execution policy. Use `npm.cmd` or run Node
> directly, e.g. `node node_modules/next/dist/bin/next dev`.

---

InsForge accounts are created from `/register`; local demo passwords are not InsForge credentials.

---

## Environment variables

See [`.env.example`](.env.example). Set these InsForge variables in `.env.local` before starting the app:

- `NEXT_PUBLIC_SITE_URL` — canonical site URL.
- `NEXT_PUBLIC_APP_URL` — app origin used for the InsForge OAuth callback.
- `NEXT_PUBLIC_INSFORGE_URL` / `NEXT_PUBLIC_INSFORGE_ANON_KEY` — user-scoped InsForge connection. Get the URL from `.insforge/project.json` and the anon key with `npx -y @insforge/cli secrets get ANON_KEY`. Never put an admin/API key in a `NEXT_PUBLIC_` variable.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — enables embedded maps; without it the map falls back to an
  external Google Maps link.
- `LIBRETRANSLATE_URL` / `LIBRETRANSLATE_API_KEY` — optional self-hosted LibreTranslate endpoint
  for translating uncatalogued and user-submitted text. Common interface text uses the built-in
  Bengali dictionary and does not require a translation service. When configured, visible page
  text, including user-submitted content, is sent to this translation server while Bengali is
  selected; the API key remains server-side.

The language preference is saved in a browser cookie. Admin and moderator accounts always see the
English interface; other users can switch between English and Bengali. Admin content is excluded
from automatic translation. Bengali text uses a locally bundled Noto Sans Bengali font.

---

## Architecture

```
src/
├── app/                 # Route handlers and pages (server components by default)
│   ├── (public routes)  # /, /places, /institutions, /hospitals, /businesses,
│   │                    # /government-services, /blood-donation, /community, /news,
│   │                    # /divisions, /districts, /search, /about, /contact, …
│   ├── login|register|…  # Authentication routes
│   ├── dashboard|profile|my-*  # Signed-in account routes
│   ├── admin/           # Protected administration panel
│   └── api/locations    # Dependent-select data
├── components/
│   ├── ui/              # Design primitives (Button, Input, Badge, Pagination, …)
│   ├── layout/          # Header, Footer, PageHeader, AccountShell, …
│   ├── cards/           # PlaceCard, InstitutionCard, NewsCard, …
│   ├── search/          # DirectoryFilters (composable filters), HeroSearch
│   ├── blood|community|places|… # Feature-specific components
├── features/            # Server actions per feature (auth, community, blood, admin, …)
├── services/            # Data-access layer (one module per domain)
├── lib/
│   ├── auth/            # password hashing, sessions, permissions, current user
│   ├── db/              # file-backed store
│   ├── validation/      # Zod schemas
│   ├── security/        # rate limiting + input sanitising
│   ├── seo/ query/      # query helpers, metadata
│   └── utils.ts constants.ts
├── config/              # Site config, navigation, permissions
├── data/                # Static seed data + seeder
├── types/               # Shared TypeScript types
└── public/              # Static images, icons, manifest
```

### Key design rules

- **Server Components by default.** `"use client"` is used only for components that need state,
  effects or browser APIs.
- **Data access lives in `services/`**, never inside presentational components.
- **Server actions** (`features/*/actions.ts`, marked `"use server"`) perform all mutations and
  enforce permissions before touching the store.
- **Filters are composable**: keyword, division, district, upazila, category and sort combine, and
  "All" is simply an absent filter.
- **Donor privacy**: only donors who consented to being listed appear publicly, and contact values
  are released only to an approved requester via a server action.

---

## Data model

The store (`src/types/admin.ts` → `Database`) contains users, locations (division/district/upazila/
union), places, institutions, businesses, government services, news, reviews, posts, comments,
reports, connections, conversations, messages, notifications, donors, blood requests, saved items,
audit logs, corrections and platform settings.

In local mode the store lives at `.data/db.json` (git-ignored) and is seeded on first run from
`src/data`. It is never committed.

---

## Testing

```bash
npm test
```

Tests cover the utilities, composable query filters, role-based permissions and the seed dataset.

---

## SEO & accessibility

- Per-route `metadata`, `generateMetadata` for dynamic pages, canonical URLs and Open Graph tags.
- `/sitemap.xml` includes public, indexable routes; `/robots.txt` disallows private areas.
- Semantic landmarks, one `<h1>` per page, labelled form controls, keyboard-focusable controls and a
  skip link.

---

## Known pending items (as stated in the brief)

- Realtime messaging is not enabled (conversations and sending work; live updates do not).
- The full account settings workflow is incomplete.
- `sample_records` and `profiles` have InsForge RLS. The backend’s other domain tables are separate
  from this user-owned records flow and have not been migrated by this auth change.
- Add your deployed app’s `/api/auth/callback` URL to InsForge’s allowed redirect URLs before using
  Google OAuth on the production domain. Google OAuth is already enabled in the linked backend.

# deshconnect