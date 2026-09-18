import { integer, jsonb, pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  razorpayCustomerId: text("razorpay_customer_id"),
});

export const deviceSessions = pgTable("device_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
});

export const practiceEvents = pgTable("practice_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  kind: text("kind").notNull(),
  content: text("content"),
  metadata: jsonb("metadata"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dailyUsage = pgTable("daily_usage", {
  userId: text("user_id").notNull(),
  usageDate: text("usage_date").notNull(),
  textMessages: integer("text_messages").default(0).notNull(),
  voiceSeconds: integer("voice_seconds").default(0).notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.usageDate] })]);

export const entitlements = pgTable("entitlements", {
  userId: text("user_id").primaryKey(),
  plan: text("plan").default("free").notNull(),
  status: text("status").default("active").notNull(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
  provider: text("provider"),
  providerCustomerId: text("provider_customer_id"),
  providerSubscriptionId: text("provider_subscription_id"),
  pendingPaymentId: text("pending_payment_id"),
  selectedPlan: text("selected_plan"),
});

export const lessonProgress = pgTable("lesson_progress", {
  userId: text("user_id").notNull(),
  lessonId: text("lesson_id").notNull(),
  level: text("level").notNull(),
  completedMinutes: integer("completed_minutes").default(0).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.lessonId] })]);

export const billingEvents = pgTable("billing_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});