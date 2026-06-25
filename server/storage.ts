import { eq, sql } from "drizzle-orm";
import { type User, type InsertUser, type Profile, type InsertProfile, users, profiles } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  listUsers(): Promise<User[]>;
  validatePassword(user: User, password: string): Promise<boolean>;
  ensureAdminExists(): Promise<void>;
  // Profile methods
  getProfile(id: string): Promise<Profile | undefined>;
  getProfileByUserId(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, profile: Partial<InsertProfile>): Promise<Profile | undefined>;
  deleteProfile(id: string): Promise<void>;
}

// ─── In-Memory Storage (for local dev without PostgreSQL) ───
class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private profiles: Map<string, Profile> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = Math.random().toString(36).substring(2, 9);
    const hashedPassword = await hashPassword(insertUser.password);
    const user: User = { ...insertUser, password: hashedPassword, id, isAdmin: !!insertUser.isAdmin, isActive: insertUser.isActive ?? true };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const data = { ...updates };
    if (data.password) {
      data.password = await hashPassword(data.password);
    }
    const updated: User = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return comparePasswords(password, user.password);
  }

  async ensureAdminExists(): Promise<void> {
    const admin = await this.getUserByUsername("admin");
    if (!admin) {
      await this.createUser({
        username: "admin",
        password: "admin123",
        isAdmin: true,
        isActive: true,
      });
    }
  }

  async getProfile(id: string): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async getProfileByUserId(userId: string): Promise<Profile | undefined> {
    return Array.from(this.profiles.values()).find(p => p.userId === userId);
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const p: Profile = { 
      ...profile, 
      userId: profile.userId ?? null,
      bio: profile.bio ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      theme: profile.theme ?? "glass",
      customDomain: profile.customDomain ?? null,
      isEditable: profile.isEditable ?? true,
      createdAt: new Date().toISOString()
    };
    this.profiles.set(p.id, p);
    return p;
  }

  async updateProfile(id: string, updates: Partial<InsertProfile>): Promise<Profile | undefined> {
    const profile = this.profiles.get(id);
    if (!profile) return undefined;
    const updated: Profile = { ...profile, ...updates };
    this.profiles.set(id, updated);
    return updated;
  }
  async deleteProfile(id: string): Promise<void> {
    this.profiles.delete(id);
  }
}

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

class DatabaseStorage implements IStorage {
  private db: any;

  async getDb() {
    if (this.db) return this.db;
    try {
      const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 10000,
        ssl: {
          rejectUnauthorized: false
        }
      });
      this.db = drizzle(pool);
      return this.db;
    } catch (err) {
      console.error("Database connection failed:", err);
      throw err;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const db = await this.getDb();
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await this.getDb();
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = await this.getDb();
    const hashed = await hashPassword(insertUser.password);
    const result = await db
      .insert(users)
      .values({ ...insertUser, password: hashed })
      .returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const db = await this.getDb();
    const data = { ...updates };
    if (data.password) {
      data.password = await hashPassword(data.password);
    }
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    const db = await this.getDb();
    await db.delete(users).where(eq(users.id, id));
  }

  async listUsers(): Promise<User[]> {
    const db = await this.getDb();
    return await db.select().from(users);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return comparePasswords(password, user.password);
  }

  async ensureAdminExists(): Promise<void> {
    try {
      const db = await this.getDb();
      // Ensure tables exist (Basic migration)
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          is_admin BOOLEAN NOT NULL DEFAULT FALSE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE
        );
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          bio TEXT,
          avatar_url TEXT,
          theme TEXT DEFAULT 'glass',
          links TEXT NOT NULL,
          custom_domain TEXT,
          is_editable BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      try { await db.execute(sql`ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey`); } catch(e) {}
      try { await db.execute(sql`ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`); } catch(e) {}

      const admin = await this.getUserByUsername("admin");
      if (!admin) {
        await this.createUser({
          username: "admin",
          password: "admin123",
          isAdmin: true,
          isActive: true,
        });
        console.log("[storage] Default admin created: admin / admin123");
      }
    } catch (err) {
      console.error("[storage] Auto-migration error:", err);
    }
  }

  async getProfile(id: string): Promise<Profile | undefined> {
    const db = await this.getDb();
    const result = await db.select().from(profiles).where(eq(profiles.id, id));
    return result[0];
  }

  async getProfileByUserId(userId: string): Promise<Profile | undefined> {
    const db = await this.getDb();
    const result = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return result[0];
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const db = await this.getDb();
    const result = await db.insert(profiles).values(profile).returning();
    return result[0];
  }

  async updateProfile(id: string, updates: Partial<InsertProfile>): Promise<Profile | undefined> {
    const db = await this.getDb();
    const result = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.id, id))
      .returning();
    return result[0];
  }

  async deleteProfile(id: string): Promise<void> {
    const db = await this.getDb();
    await db.delete(profiles).where(eq(profiles.id, id));
  }
}

// Auto-select: use PostgreSQL if DATABASE_URL is set, else use in-memory
export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemoryStorage();
