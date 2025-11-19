# Movie Reservations API

A comprehensive backend service for managing movie theater reservations, built with Fastify, TypeScript, and Drizzle ORM. This API provides functionality for movie listings, hall management, seat reservations, and payment processing via Stripe.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Implemented Features](#implemented-features)
- [Planned Features](#planned-features)
- [API Endpoints](#api-endpoints)

## Features

### Core Features

- **User Authentication**: Register and login with JWT-based authentication
- **Movie Management**: List movies and manage showtimes (admin only)
- **Hall Management**: Create and manage cinema halls with custom layouts
- **Seat Reservations**: Reserve seats, confirm bookings, and cancel reservations
- **Payment Integration**: Stripe integration for secure payment processing
- **Role-Based Access**: Admin and user role distinction with protected endpoints

### Advanced Features

- **Custom Hall Layouts**: Define disabled seats, VIP seats, and layout configurations
- **Dynamic Pricing**: Configure pricing by seat category per hall
- **Reservation Status Tracking**: Pending, confirmed, and cancelled states
- **Refund Management**: Support for refund requests with system and user initiators
- **Ticket Management**: Generate and track tickets for reservations

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Fastify 5.x
- **Language**: TypeScript 5.x
- **Database**: SQLite with Drizzle ORM
- **Authentication**: JWT (jsonwebtoken)
- **Payment**: Stripe API

## Project Structure

```
src/
├── app.ts                 # Application entry point
├── utils.ts              # Utility functions
├── env.ts                # Environment configuration
│
├── db/
│   ├── index.ts          # Database connection
│   ├── schema.ts         # Drizzle schema definitions
│   └── seed.ts           # Database seeding script
│
├── lib/
│   ├── constants.ts      # Application constants
│   ├── logger.ts         # Logging utility
│   ├── payments.ts       # Payment processing logic
│   ├── reservations.ts   # Reservation business logic
│   └── stripe.ts         # Stripe client configuration
│
├── middleware/
│   └── auth.ts           # Authentication & authorization middleware
│
├── modules/              # Feature modules
│   ├── auth/             # Authentication (register, login)
│   ├── movies/           # Movie & showtime management
│   ├── halls/            # Hall & layout management
│   ├── reservations/     # Reservation management
│   ├── tickets/          # Ticket management
│   └── refunds/          # Refund request handling
│
└── routes/               # Route definitions
    ├── index.ts          # Route mounting
    ├── auth.ts
    ├── movies.ts
    ├── halls.ts
    ├── reservations.ts
    └── stripe.ts
```

## Setup & Installation

### Prerequisites

- Node.js 18+ or compatible runtime
- pnpm

### Installation Steps

1. **Clone and Navigate**

   ```bash
   git clone <repository-url>
   cd mov-reservations
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory (see [Environment Variables](#environment-variables))

4. **Initialize Database**

   ```bash
   # Generate database schema
   pnpm db:generate

   # You can choose to push or migrate. I push:
   # Push schema to database
   pnpm db:push

   # Seed database with initial data
   pnpm db:seed
   ```

5. **Start Development Server**

   ```bash
   pnpm dev
   ```

   Server will start on `http://localhost:3000`

### Build & Production

```bash
# Build TypeScript
pnpm build

# Start production server
pnpm start
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=file:./app.db

# Node Environment
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret

# Stripe Configuration
STRIPE_KEY=sk_test_your_stripe_secret_key

# For this setup, you just need a single product in stripe
# It represents the whole theatre system
STRIPE_PRODUCT_ID=prod_your_product_id
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Environment Variable Descriptions

- **DATABASE_URL**: Connection string to SQLite database or Turso database
- **NODE_ENV**: Environment mode (development, test, production)
- **JWT_SECRET**: Secret key for JWT token signing/verification
- **STRIPE_KEY**: Stripe secret API key for payment processing
- **STRIPE_PRODUCT_ID**: Stripe product ID for ticket pricing
- **STRIPE_WEBHOOK_SECRET**: Webhook signing secret for Stripe event verification

## Database

### Schema Overview

**Users**

- User accounts with role-based access (admin/user)
- Email-based authentication
- Password hashing with bcryptjs

**Movies**

- Movie metadata (title, description, duration, rating, genre)
- Release date and timestamps

**ShowTimes**

- Movie showtimes per hall
- Start and end time tracking
- Composite primary key: (hallId, startTime)

**Halls**

- Cinema hall information
- Custom layout configurations
- Seat and pricing management

**Seats & Reserved Seats**

- Seat mapping with pricing categories
- Temporary seat reservations with expiration
- Prevents double-booking

**Reservations**

- User seat reservations
- Status tracking (pending, confirmed, cancelled)
- Checkout session integration

**Tickets**

- Generated after confirmed payment
- Unique ticket ID generation
- Payment status tracking
- Refund metadata support

**Pricing Rules**

- Dynamic pricing by seat category and hall
- Per-hall or global category pricing

**Refund Requests**

- User-initiated or system-initiated refunds
- Status tracking (pending, fulfilled, declined)

### Database Scripts

```bash
pnpm db:push      # Push current schema to database
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Run migrations
pnpm db:seed      # Reset and re-Seed database with initial data
pnpm db:reset     # Reset database
```

## Implemented Features

**User Management**

- User registration with secure password hashing
- JWT-based authentication and login
- Role-based access control (admin/user)

**Movie & Showtime Management**

- List all movies with filtering
- Admin movie CRUD operations
- Showtime creation for movies in specific halls
- Retrieve showtimes for specific movies

**Hall Management**

- List available cinema halls
- Create new halls
- Define custom hall layouts
- Disable specific seats
- Mark VIP seating areas
- Configure seat gaps and custom notes

**Reservation System**

- Create seat reservations with automatic pricing
- Retrieve user's reservations
- Confirm reservations after payment
- Cancel reservations with status tracking
- Temporary seat holds with expiration

**Payment Processing**

- Stripe integration for checkout
- Webhook handling for payment completion
- Automatic ticket generation on payment success
- Support for multiple seats in single transaction

**Ticket Management**

- Unique ticket ID generation
- Payment status tracking (pending, processing, failed, paid, refunded)
- Metadata storage for refund information

**Refund Management**

- Refund request creation and tracking
- System-initiated and user-initiated refunds
- Refund status management (pending, fulfilled, declined)

## Planned Features

**Complete Seat Chart Endpoint**

- Full real-time seat availability visualization
- Availability matrix with seat statuses
- Reserved seat expiration handling
- VIP/regular seat distinction

**Admin Dashboard Endpoints**

- Comprehensive statistics and analytics
- Revenue tracking
- Occupancy reports
- User management interfaces
- Hall and movie management dashboards

## API Endpoints

All endpoints are prefixed with `/api/v1`

### Authentication (Public)

#### Register

- **POST** `/auth/register`
- **Body**:
  ```json
  {
    "name": "string",
    "email": "user@example.com",
    "password": "string"
  }
  ```
- **Response**: User object with JWT token

#### Login

- **POST** `/auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "string"
  }
  ```
- **Response**: User object with JWT token

### Movies (Authenticated)

#### List Movies

- **GET** `/movies`
- **Query Parameters**: Pagination, filtering options
- **Response**: Array of movies with showtime information

#### Get Movie ShowTimes

- **GET** `/movies/:movieId/showtimes`
- **Response**: Array of showtimes for specific movie

#### Create Movie (Admin Only)

- **POST** `/movies`
- **Body**:
  ```json
  {
    "title": "string",
    "description": "string",
    "releaseDate": "ISO 8601 date",
    "duration": "number (seconds)",
    "rating": "number",
    "genre": "string"
  }
  ```

#### Update Movie (Admin Only)

- **PATCH** `/movies/:id`
- **Body**: Partial movie object (any updatable fields)

#### Delete Movie (Admin Only)

- **DELETE** `/movies/:id`

#### Create ShowTime (Admin Only)

- **POST** `/movies/showtimes`
- **Body**:
  ```json
  {
    "hallId": "number",
    "movieId": "number",
    "startTime": "ISO 8601 datetime",
    "endTime": "ISO 8601 datetime"
  }
  ```

### Halls (Authenticated)

#### List Halls

- **GET** `/halls`
- **Response**: Array of available cinema halls

#### Get Hall Layout

- **GET** `/halls/:hallId/layout`
- **Response**: Hall layout configuration with seat mappings

#### Get Hall Seat Chart

- **GET** `/halls/:hallId/seat-chart`
- **Response**: Current seat availability and reservation status
- **Note**: Core functionality implemented; full seat-chart endpoint still in development

#### Create Hall (Admin Only)

- **POST** `/halls`

#### Create Hall Layout (Admin Only)

- **POST** `/halls/layout`

### Reservations (Authenticated)

#### Get All User Reservations

- **GET** `/reservations`
- **Response**: Array of user's reservations

#### Get Specific Reservation

- **GET** `/reservations/:id`
- **Response**: Reservation details with seats and pricing

#### Create Reservation

- **POST** `/reservations/:hallId`
- **Body**:
  ```json
  {
    "movieId": "number",
    "startTime": "ISO 8601 datetime",
    "seatIds": [1, 2, 3]
  }
  ```
- **Response**: Reservation with pending status and checkout URL

#### Confirm Reservation

- **PATCH** `/reservations/:id/confirm`
- **Response**: Updated reservation with confirmed status

#### Cancel Reservation

- **PATCH** `/reservations/:id/cancel`
- **Response**: Confirmation message

### Payments (Stripe)

#### Stripe Webhook

- **POST** `/stripe/webhooks`
- **Purpose**: Handles Stripe payment events (checkout.session.completed)
- **Events Handled**:
  - `checkout.session.completed`: Confirms reservation and creates ticket

### Middleware Functions

- **attachClientType**: Determines if request is from authenticated or unauthenticated client
- **authenticate**: Validates JWT token and attaches user to request
- **isAdmin**: Checks if user has admin role
