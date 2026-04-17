import { eq } from "drizzle-orm";
import { type User, type InsertUser } from "@shared/schema";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  listUsers(): Promise<User[]>;
  validatePassword(user: User, password: string): Promise<boolean>;
  ensureAdminExists(): Promise<void>;
}

// ─── In-Memory Storage (for local dev without PostgreSQL) ───
class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashed = await bcrypt.hash(insertUser.password, 10);
    const user: User = {
      id: randomUUID(),
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
      data.password = await bcrypt.hash(data.password, 10);
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
    return bcrypt.compare(password, user.password);
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
}

// ─── PostgreSQL Storage (for production with DATABASE_URL) ───
class DatabaseStorage implements IStorage {
  private db: any;
  private users_table: any;

  constructor() {
    // Lazy-load pg only if DATABASE_URL is set
    this.init();
  }

  private async init() {
    try {
      const { drizzle } = await import("drizzle-orm/node-postgres");
      const { Pool } = await import("pg");
      const { users } = await import("@shared/schema");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      this.db = drizzle(pool);
      this.users_table = users;
    } catch (e) {
      console.error("[storage] DB init failed:", e);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const { eq } = await import("drizzle-orm");
    const { users } = await import("@shared/schema");
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { eq } = await import("drizzle-orm");
    const { users } = await import("@shared/schema");
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { users } = await import("@shared/schema");
    const hashed = await bcrypt.hash(insertUser.password, 10);
    const result = await this.db
      .insert(users)
      .values({ ...insertUser, password: hashed })
      .returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const { eq } = await import("drizzle-orm");
    const { users } = await import("@shared/schema");
    const data: Partial<InsertUser> = { ...updates };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const result = await this.db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    const { eq } = await import("drizzle-orm");
    const { users } = await import("@shared/schema");
    await this.db.delete(users).where(eq(users.id, id));
  }

  async listUsers(): Promise<User[]> {
    const { users } = await import("@shared/schema");
    return this.db.select().from(users);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
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
}

// Auto-select: use PostgreSQL if DATABASE_URL is set, else use in-memory
export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemoryStorage();
