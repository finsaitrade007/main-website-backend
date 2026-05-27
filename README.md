# finsai-cms

Headless CMS for the Finsai marketing site, built on **Strapi v5** (TypeScript + SQLite for dev).

It exposes a REST API consumed by [`finserv-fe`](../finserv-fe) and an admin panel at `/admin` for editors.

---

## Quick start (local)

```bash
cd /Users/akagami/finsai-cms
npm run develop
```

This will:

1. Start the server at `http://localhost:1337`
2. Open the admin panel at `http://localhost:1337/admin`
3. On the very first run, prompt you to create an admin user (email + password)
4. Auto-grant public **read** permissions on `account-tier` and `faq` endpoints (see `src/index.ts`)
5. Seed initial data (3 account tiers, 5 FAQs) if the tables are empty

Once running, sanity-check the API:

```bash
curl 'http://localhost:1337/api/account-tiers?populate=features&sort=order:asc'
curl 'http://localhost:1337/api/faqs?sort=order:asc'
```

---

## Content model

| Type          | Kind             | Fields                                                                                                  |
| ------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| Account Tier  | Collection       | `name`, `price`, `unit`, `featured`, `order`, `ctaLabel`, `ctaHref`, `features` (repeatable component)  |
| Feature       | Component        | `label`, `value`                                                                                        |
| FAQ           | Collection       | `question`, `answer`, `category`, `order`                                                               |

Schemas live in `src/api/<name>/content-types/<name>/schema.json` and `src/components/shared/feature.json`. Editing them via the admin Content-Type Builder will write back to these same files.

---

## Frontend wiring

In `finserv-fe/.env.local`:

```
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
```

The FE uses a small helper at `src/lib/strapi.ts` and consumes the API in:

- `src/components/AccountPricing.tsx` → `GET /api/account-tiers?populate=features&sort=order:asc`
- `src/components/FAQSection.tsx`     → `GET /api/faqs?sort=order:asc`

---

## CORS

Allowed origins are read from `CORS_ORIGINS` (comma-separated) in `.env`. Defaults to `http://localhost:3000`. For production set e.g.:

```
CORS_ORIGINS=https://finsai.com,https://www.finsai.com
```

---

## Useful commands

```bash
npm run develop   # dev with hot reload
npm run start     # prod server (no reload)
npm run build     # build admin panel
npm run strapi    # CLI: generate, content-types, etc.
```

---

## Deployment notes

- **DB**: swap SQLite for **Postgres** in `.env` (`DATABASE_CLIENT=postgres`) before deploying. SQLite is fine for local only.
- **Media uploads**: install a provider (`@strapi/provider-upload-aws-s3` or `cloudinary`) and configure in `config/plugins.ts`.
- **Recommended hosts**: Railway, Render, DigitalOcean App Platform, or Strapi Cloud.
- **Frontend revalidation**: add a Strapi webhook (Settings → Webhooks) pointing to your Next.js revalidate endpoint, fired on `entry.publish` / `entry.update` / `entry.delete`.

---

## Extending

To add another collection (e.g. `Testimonial`):

```bash
npm run strapi -- generate
# pick: api → name "testimonial" → no API kind → no plugin
```

…or add `src/api/testimonial/{content-types,controllers,routes,services}` by hand following the existing pattern, then grant public permissions by editing `PUBLIC_READ` in `src/index.ts`.
