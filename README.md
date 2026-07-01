# Movie Reservations

Movie reservation app with a Fastify API and React web frontend.

## Stack

- API: Fastify, TypeScript, Drizzle ORM, libSQL/SQLite, Stripe
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
DATABASE_URL=file:./app.db
JWT_SECRET=dev-secret
STRIPE_KEY=sk_test_...
STRIPE_PRODUCT_ID=prod_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Sync and seed the database:

```bash
pnpm db:push
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

## Useful Scripts

```bash
pnpm db:push      # apply schema to DB
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
