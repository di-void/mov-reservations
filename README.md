# Movie Reservations

Movie reservation app with a Fastify API and React web frontend.

## Stack

- API: Fastify, TypeScript, Drizzle ORM, PostgreSQL, Stripe
- Web: React, Vite, TanStack Query, Zustand, Tailwind CSS
- Package manager: pnpm workspace

## Apps

```text
apps/api  Fastify API on http://localhost:3000
apps/web  Vite app on http://localhost:5173
```

## Setup

```bash
pnpm install
```

Create `apps/api/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/mov_reservations
JWT_SECRET=dev-secret
STRIPE_KEY=sk_test_...
STRIPE_PRODUCT_ID=prod_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Create an empty PostgreSQL database, then migrate and seed it:

```bash
pnpm db:migrate
pnpm db:seed
```

`db:seed` resets existing data.

## Run

Run both apps:

```bash
pnpm dev
```

Run one app:

```bash
pnpm dev:api
pnpm dev:web
```

Build:

```bash
pnpm build
```

## Auth

Web routes are protected except:

- `/login`
- `/register`

The frontend stores the JWT and user in `localStorage`.

Seeded admin user:

```text
email: admin@mov-reservations.com
password: admin
```

## API

All routes are under `/api/v1`.

Public:

```text
POST /auth/register
POST /auth/login
GET  /movies
GET  /movies/:movieId/showtimes
GET  /halls
GET  /halls/:hallId/layout
GET  /halls/:hallId/seat-chart?time=<ISO datetime>
```

Authenticated:

```text
GET   /reservations
GET   /reservations/:id
POST  /reservations/:hallId
PATCH /reservations/:id/confirm
PATCH /reservations/:id/cancel
```

Admin:

```text
POST   /movies
POST   /movies/showtimes
PATCH  /movies/:id
DELETE /movies/:id
POST   /halls
POST   /halls/layout
```

Stripe:

```text
POST /stripe/webhooks
```

## Reservation Flow

1. Log in.
2. Pick a movie.
3. Pick a showtime.
4. Pick seats.
5. Continue to Stripe Checkout.
6. Stripe webhook confirms the reservation after payment.

Reservation creation returns a pending reservation and a Stripe checkout URL.

## Testing

The API has a small database integration suite focused on reservation invariants and concurrency regressions. Run it from the repository root:

```bash
pnpm --filter @mov-reservations/api test
```

The suite verifies that:

- Only one of two competing requests can claim the same seat.
- A multi-seat request claims every requested seat or none of them.
- Concurrent confirmation creates one ticket and one confirmed reservation.
- Confirming a reservation does not change the same seat at another showtime.
- A reservation cannot confirm an expired hold after another reservation acquires it.

Tests use the real Drizzle queries and transactions against PostgreSQL. They create a unique `mov_reservations_test_*` schema in the database from `apps/api/.env` (or `TEST_DATABASE_URL`), apply the checked-in migrations there, and drop that schema afterward. The database user needs permission to create schemas. Every test connection uses only that schema in its search path, so tables in `public` are untouched. Race tests run competing operations in separate processes with independent connections. Tests do not contact Stripe.

## Useful Scripts

```bash
pnpm --filter @mov-reservations/api test
pnpm db:push      # sync schema directly for local prototyping
pnpm db:seed      # reset and seed demo data
pnpm db:reset     # reset DB
pnpm db:generate  # generate migrations
pnpm db:migrate   # run migrations
pnpm build:api
pnpm build:web
```

## Planned Features

- Admin UI for movies, halls, layouts, showtimes, and pricing.
- Reservation success page after Stripe Checkout.
- Stripe CLI webhook setup notes.
- Seat chart generated from hall layout config.
- Ticket view after payment confirmation.
- Refund request UI and admin review flow.
- Better empty and error states in the web app.
