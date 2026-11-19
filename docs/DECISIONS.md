# Architecture Decisions

## ADR-001: Embedded Sanity Studio (superseded by ADR-014)

Embed Sanity Studio within the Next.js app at `/studio` using `next-sanity`.

**Rationale**: Single deployment (Cloudflare Workers, see ADR-013). Parish staff access the studio through the same domain. No additional hosting needed.

## ADR-002: Singleton for Parish Settings

Use a single `parishSettings` document with a fixed ID instead of multiple configuration documents.

**Rationale**: Parish has one set of contact details, schedules, and social links. A singleton prevents duplicate or conflicting settings. Queried by `_id` for efficiency.

## ADR-003: Portable Text for Rich Content

Use Sanity Portable Text (`blockContent` object type) for all rich text fields.

**Rationale**: Structured, queryable, renders to React components. Safer than raw HTML. Supports embedded images and links.

## ADR-004: Server Components by Default

React Server Components for all pages. Client Components only for interactive elements requiring browser APIs or state.

**Rationale**: Less client JS, direct data fetching, SEO benefits. Aligns with Next.js App Router conventions.

## ADR-005: No Separate Backend

No Express server, API layer, or database beyond Sanity.

**Rationale**: Parish website is content-driven with no authenticated user features, transactions, or real-time data. Sanity handles content storage, CDN, and media hosting.

## ADR-006: Schedule Entries as Structured Objects

Mass times, confession schedules, and office hours stored as arrays of `scheduleEntry` objects (label + time + optional note) rather than free-text.

**Rationale**: Enables consistent rendering and future features (e.g., "next Mass" calculations) without parsing free-form text.

## ADR-007: Server Actions for Form Submission

Use React Server Actions (via `useActionState`) instead of API Route Handlers for contact and prayer request forms.

**Rationale**: Server Actions integrate naturally with React's form handling, provide built-in pending states, work with progressive enhancement, and avoid maintaining separate API routes. The `useActionState` hook gives typed state transitions (idle → pending → success/error) without extra client-side state management.

## ADR-008: In-Memory Rate Limiting

Use an in-memory `Map` for rate limiting form submissions instead of an external store.

**Rationale**: No paid dependency required. Provides baseline protection against rapid repeated submissions within a single serverless instance lifetime. The primary spam defense is Cloudflare Turnstile — rate limiting is a secondary layer. For production-grade rate limiting that survives cold starts, upgrade to a Durable Object or Upstash Redis.

## ADR-009: No Database Storage for Form Submissions

Contact messages and prayer requests are emailed directly to parish staff and not stored in any database.

**Rationale**: Reduces data liability — no sensitive prayer content or personal data is persisted. Parish staff manage messages through their email inbox. If archival is needed later, Resend provides delivery logs, or a database can be added as a future enhancement.

## ADR-010: Cloudflare Turnstile over reCAPTCHA

Use Cloudflare Turnstile for form spam protection instead of Google reCAPTCHA.

**Rationale**: Privacy-focused (no tracking cookies), free, simpler integration, and does not require users to solve visual challenges. Server-side verification via a single POST request to Cloudflare's API.

## ADR-011: Columbarium Not Added to the Desktop Top-Level Nav

The `/columbarium` page is linked from the mobile nav drawer and the footer's Quick Links, but not added as a 9th item in the desktop header bar.

**Rationale**: The desktop nav (8 items + Donate button) is already near its practical width limit at the `lg:` (1024px) breakpoint where it first appears. A 9th item risks wrapping/cramping on smaller laptop screens. The mobile drawer has no such constraint (vertical, scrollable list), so Columbarium is fully reachable there and via the footer on every screen size without redesigning the primary nav. Revisit if the desktop nav is ever restructured (e.g., a "More" menu).

## ADR-012: Live Mass Bypasses the Live Content API for a Time-Based Revalidate

`/` and `/live` fetch `liveStream` through a dedicated `fetchLiveStreamData()` (plain `client.fetch()`, `useCdn: false`, `next: { revalidate: 30 }`) instead of the site's usual `sanityFetch` (Sanity's Live Content API, `next-sanity/live`).

**Rationale**: Proven empirically during the pre-launch audit (publish a change in Sanity with zero browser tabs open anywhere, then load the page fresh — the Live Content API never caught up, because its on-demand revalidation only fires when a connected `<SanityLive />` client observes a mutation event; a cold server with no visitors at publish time stays stale indefinitely, and even a connected client didn't reliably flip within the target window in repeated testing). The underlying `sanityFetch` also hardcodes its fetch to `revalidate: false`, so a page-level `export const revalidate` alone would not have fixed it — the fetch itself needed a numeric revalidate. This fetch is intentionally scoped to only the two Live Mass fields; every other `parishSettings` field (address, schedules, etc.) still goes through the normal on-demand `sanityFetch` path, so only Live Mass pays the cost of a 30s-interval background refetch, not the rest of the site.

## ADR-013: Host on Cloudflare Workers Instead of Vercel

Deploy with `@opennextjs/cloudflare` to a Cloudflare Worker (`wrangler.jsonc`, `open-next.config.ts`). Next.js was raised to 16.4.6 because the adapter's peer range excludes 16.0–16.4.4.

**Rationale**: Parish chose Cloudflare (domain, DNS, Turnstile already there). Caching uses Workers KV (incremental cache) + a Durable Object queue (time-based ISR, ADR-012) + a sharded Durable Object tag cache (Sanity Live's `revalidateTag`) — without the latter two, schedules would go stale. KV is eventually consistent, so cache updates may take time to propagate globally. The embedded Studio (ADR-001) put the Worker at ~4.5 MiB gzipped, over the free plan's 3 MiB limit; see ADR-014. OpenNext does not guarantee Windows support, so production builds run on Cloudflare Workers Builds (Linux), not locally.

## ADR-014: Studio Hosted on sanity.studio, Not Embedded

Removed the `/studio` route. The Studio is deployed with `npm.cmd run studio:deploy` (`sanity deploy`) to https://san-roque-sampaloc.sanity.studio.

**Rationale**: Keeps the Cloudflare Worker at ~1.5 MiB gzipped, inside the Workers free plan (3 MiB), instead of paying $5/month for the embedded Studio. Sanity hosts the Studio free and allows its own CORS origin automatically. `sanity.config.ts` and `sanity.cli.ts` hardcode the (public) project ID and dataset, because a sanity.studio build only exposes `SANITY_STUDIO_*` env vars. Schema changes now need a Studio redeploy in addition to the site deploy.
