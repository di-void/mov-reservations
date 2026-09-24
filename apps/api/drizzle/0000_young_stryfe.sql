CREATE TABLE "hall_layouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"config" jsonb NOT NULL,
	"hall_id" integer NOT NULL,
	"row_count" integer NOT NULL,
	"seats_per_row" integer NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "halls" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"release_date" timestamp (3) with time zone NOT NULL,
	"duration" integer NOT NULL,
	"rating" integer NOT NULL,
	"genre" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"hall_id" integer,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	CONSTRAINT "pricing_rules_hallId_category_unique" UNIQUE("hall_id","category")
);
--> statement-breakpoint
CREATE TABLE "refund_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"reason" text,
	"initiator" text DEFAULT 'system' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reservation_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"seats" jsonb NOT NULL,
	"user_id" integer NOT NULL,
	"hall_id" integer NOT NULL,
	"movie_id" integer NOT NULL,
	"checkout_id" text,
	"start_time" timestamp (3) with time zone NOT NULL,
	"end_time" timestamp (3) with time zone NOT NULL,
	"status" text NOT NULL,
	"total_amount" integer NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp (3) with time zone,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reserved_seats" (
	"hall_id" integer NOT NULL,
	"seat_id" integer NOT NULL,
	"start_time" timestamp (3) with time zone NOT NULL,
	"reserved_at" timestamp (3) with time zone,
	"expires_at" timestamp (3) with time zone,
	CONSTRAINT "reserved_seats_hall_id_seat_id_start_time_pk" PRIMARY KEY("hall_id","seat_id","start_time")
);
--> statement-breakpoint
CREATE TABLE "seats" (
	"id" integer NOT NULL,
	"price_id" integer NOT NULL,
	"hall_id" integer NOT NULL,
	CONSTRAINT "seats_id_hall_id_pk" PRIMARY KEY("id","hall_id")
);
--> statement-breakpoint
CREATE TABLE "show_times" (
	"hall_id" integer NOT NULL,
	"movie_id" integer NOT NULL,
	"start_time" timestamp (3) with time zone NOT NULL,
	"end_time" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "show_times_hall_id_start_time_pk" PRIMARY KEY("hall_id","start_time")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_id" integer NOT NULL,
	"payment_status" text NOT NULL,
	"total_amount" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_reservationId_unique" UNIQUE("reservation_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "hall_layouts" ADD CONSTRAINT "hall_layouts_hall_id_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."halls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_hall_id_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."halls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "show_time_fk" FOREIGN KEY ("hall_id","start_time") REFERENCES "public"."show_times"("hall_id","start_time") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reserved_seats" ADD CONSTRAINT "reserved_seats_hall_id_start_time_show_times_hall_id_start_time_fk" FOREIGN KEY ("hall_id","start_time") REFERENCES "public"."show_times"("hall_id","start_time") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reserved_seats" ADD CONSTRAINT "reserved_seats_hall_id_seat_id_seats_hall_id_id_fk" FOREIGN KEY ("hall_id","seat_id") REFERENCES "public"."seats"("hall_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_price_id_pricing_rules_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."pricing_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_hall_id_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."halls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_times" ADD CONSTRAINT "show_times_hall_id_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."halls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_times" ADD CONSTRAINT "show_times_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;