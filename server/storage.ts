import { eq } from "drizzle-orm";
import { type User, type InsertUser } from "@shared/schema";
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
    const hashed = await hashPassword(insertUser.password);
    const user: User = {
      id: Math.random().toString(36).substring(2, 9),
      username: insertUser.username,
      password: hashed,
      isAdmin: insertUser.isAdmin ?? false,
      isActive: insertUser.isActive ?? true,
    };
    this.users.set(user.id, user);
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
      console.log("[storage] Default admin created: admin / admin123");
    }
  }

  async getProfile(id: string): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async getProfileByUserId(userId: string): Promise<Profile | undefined> {
    return Array.from(this.profiles.values()).find(p => p.userId === userId);
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const newProfile: Profile = {
      id: Math.random().toString(36).substring(2, 9),
      ...profile,
    };
    this.profiles.set(newProfile.id, newProfile);
    return newProfile;
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
import pg from "pg";
const { Pool } = pg;

// ─── PostgreSQL Storage (for production with DATABASE_URL) ───
class DatabaseStorage implements IStorage {
  private db: any;

  constructor() {
    this.init();
  }

  private init() {
    // Moved to lazy initialization to prevent startup crashes
  }

  private async getDb() {
    if (this.db) return this.db;
    
    try {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined");
      }
      
      console.log("[storage] Connecting to PostgreSQL (Lazy Init)...");
      const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 10000,
        ssl: true
      });
      
      this.db = drizzle(pool);
      console.log("[storage] Database connection initialized");
      return this.db;
    } catch (e) {
      console.error("[storage] Database initialization FAILED:", e);
      throw e;
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
    const data: Partial<InsertUser> = { ...updates };
    if (data.password) {
      data.password = await hashPassword(data.password);
    }
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    const db = await this.getDb();
    await db.delete(users).where(eq(users.id, id));
  }

  async listUsers(): Promise<User[]> {
    const db = await this.getDb();
    return db.select().from(users);
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
      console.log("[storage] Default admin created: admin / admin123");
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
    const result = await db.update(profiles).set(updates).where(eq(profiles.id, id)).returning();
    return result[0];
  }
}

// Auto-select: use PostgreSQL if DATABASE_URL is set, else use in-memory
export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemoryStorage();
