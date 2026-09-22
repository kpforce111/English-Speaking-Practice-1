import { integer, jsonb, pgTable, text, timestamp, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  razorpayCustomerId: text("razorpay_customer_id"),
}, (table) => [uniqueIndex("users_clerk_user_id_unique").on(table.clerkUserId)]);

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

export const boxSubscriptions = pgTable("box_subscriptions", {
  userId: text("user_id").notNull(),
  boxId: text("box_id").notNull(),
  plan: text("plan").default("free").notNull(),
  status: text("status").default("inactive").notNull(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
  provider: text("provider"),
  providerCustomerId: text("provider_customer_id"),
  providerSubscriptionId: text("provider_subscription_id"),
  pendingPaymentId: text("pending_payment_id"),
  selectedPlan: text("selected_plan"),
}, (table) => [
  primaryKey({ columns: [table.userId, table.boxId] }),
  uniqueIndex("box_subscriptions_provider_subscription_unique").on(table.providerSubscriptionId),
]);

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

export const beginnerProfiles = pgTable("beginner_profiles", {
  userId: text("user_id").primaryKey(),
  level: text("level").default("level_0").notNull(),
  assessmentCompleted: integer("assessment_completed").default(0).notNull(),
  sessionsCompleted: integer("sessions_completed").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const beginnerItemProgress = pgTable("beginner_item_progress", {
  userId: text("user_id").notNull(),
  itemId: text("item_id").notNull(),
  kind: text("kind").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  correctAttempts: integer("correct_attempts").default(0).notNull(),
  mistakeCount: integer("mistake_count").default(0).notNull(),
  lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.itemId] })]);

export const beginnerAssessments = pgTable("beginner_assessments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  level: text("level").notNull(),
  results: jsonb("results").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const beginnerSessionSummaries = pgTable("beginner_session_summaries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionDate: text("session_date").notNull(),
  wordsLearned: integer("words_learned").default(0).notNull(),
  sentencesPracticed: integer("sentences_practiced").default(0).notNull(),
  conversationsPracticed: integer("conversations_practiced").default(0).notNull(),
  pronunciationMistakes: integer("pronunciation_mistakes").default(0).notNull(),
  sentenceMistakes: integer("sentence_mistakes").default(0).notNull(),
  weakItems: jsonb("weak_items").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("beginner_session_summary_user_date").on(table.userId, table.sessionDate)]);

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text("updated_by").notNull(),
});