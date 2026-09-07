CREATE TABLE `hall_layouts` (
	`id` integer PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`hall_id` integer NOT NULL,
	`row_count` integer NOT NULL,
	`seats_per_row` integer NOT NULL,
	`created_at` integer DEFAULT '"2026-09-07T11:00:03.943Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2026-09-07T11:00:03.943Z"' NOT NULL,
	FOREIGN KEY (`hall_id`) REFERENCES `halls`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `halls` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT '"2026-09-07T11:00:03.942Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2026-09-07T11:00:03.942Z"' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movies` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`release_date` integer NOT NULL,
	`duration` integer NOT NULL,
	`rating` integer NOT NULL,
	`genre` text NOT NULL,
	`created_at` integer DEFAULT '"2026-09-07T11:00:03.942Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2026-09-07T11:00:03.942Z"' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pricing_rules` (
	`id` integer PRIMARY KEY NOT NULL,
	`hall_id` integer,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	FOREIGN KEY (`hall_id`) REFERENCES `halls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pricing_rules_hallId_category_unique` ON `pricing_rules` (`hall_id`,`category`);--> statement-breakpoint
CREATE TABLE `refund_requests` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`reason` text,
	`initiator` text DEFAULT 'system' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reservation_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` integer PRIMARY KEY NOT NULL,
	`seats` text NOT NULL,
	`user_id` integer NOT NULL,
	`hall_id` integer NOT NULL,
	`movie_id` integer NOT NULL,
	`checkout_id` text,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`status` text NOT NULL,
	`total_amount` integer NOT NULL,
	`created_at` integer DEFAULT '"2026-09-07T11:00:03.943Z"' NOT NULL,
	`cancelled_at` integer,
	`updated_at` integer DEFAULT '"2026-09-07T11:00:03.943Z"' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hall_id`,`start_time`) REFERENCES `show_times`(`hall_id`,`start_time`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reserved_seats` (
	`hall_id` integer NOT NULL,
	`seat_id` integer NOT NULL,
	`start_time` integer,
	`reserved_at` integer,
	`expires_at` integer,
	PRIMARY KEY(`hall_id`, `seat_id`, `start_time`),
	FOREIGN KEY (`hall_id`,`start_time`) REFERENCES `show_times`(`hall_id`,`start_time`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hall_id`,`seat_id`) REFERENCES `seats`(`hall_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `seats` (
	`id` integer NOT NULL,
	`price_id` integer NOT NULL,
	`hall_id` integer NOT NULL,
	PRIMARY KEY(`id`, `hall_id`),
	FOREIGN KEY (`price_id`) REFERENCES `pricing_rules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hall_id`) REFERENCES `halls`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `show_times` (
	`hall_id` integer NOT NULL,
	`movie_id` integer NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`created_at` integer DEFAULT '"2026-09-07T11:00:03.942Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2026-09-07T11:00:03.942Z"' NOT NULL,
	PRIMARY KEY(`hall_id`, `start_time`),
	FOREIGN KEY (`hall_id`) REFERENCES `halls`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`reservation_id` integer NOT NULL,
	`payment_status` text NOT NULL,
	`total_amount` integer NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT '"2026-09-07T11:00:03.943Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2026-09-07T11:00:03.943Z"' NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_reservationId_unique` ON `tickets` (`reservation_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer DEFAULT '"2026-09-07T11:00:03.942Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2026-09-07T11:00:03.942Z"' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);