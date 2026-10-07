import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey(), // We'll generate custom short IDs
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  theme: text("theme").default("glass"),
  links: text("links").notNull(), // JSON string
  customDomain: text("custom_domain"),
  isEditable: boolean("is_editable").notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isAdmin: true,
  isActive: true,
});

export const insertProfileSchema = createInsertSchema(profiles).pick({
  id: true,
  userId: true,
  name: true,
  bio: true,
  avatarUrl: true,
  theme: true,
  links: true,
  customDomain: true,
  isEditable: true,
});

export const activationCards = pgTable("activation_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenHash: text("token_hash").notNull().unique(),
  status: text("status").notNull().default("available"),
  profileId: varchar("profile_id").references(() => profiles.id, { onDelete: 'set null' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  activatedAt: text("activated_at"),
  disabledAt: text("disabled_at"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type ActivationCard = typeof activationCards.$inferSelect;

