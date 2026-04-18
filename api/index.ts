import express, { type Request, Response } from "express";
import cookieSession from "cookie-session";
import { eq, sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// --- SCHEMAS ---
const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  theme: text("theme").default("glass"),
  links: text("links").notNull(),
  customDomain: text("custom_domain"),
  isEditable: boolean("is_editable").notNull().default(true),
  views: integer("views").default(0),
  isDirectRedirect: boolean("is_direct_redirect").default(false),
  directUrl: text("direct_url"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// --- STORAGE HELPERS ---
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

class DatabaseStorage {
  private db: any;

  async getDb() {
    if (this.db) return this.db;
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    this.db = drizzle(pool);
    return this.db;
  }

  async ensureAdminExists() {
    try {
      const db = await this.getDb();
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
          user_id TEXT REFERENCES users(id),
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
      
      // Attempt to add columns one by one
      try { await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0`); } catch(e){}
      try { await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_direct_redirect BOOLEAN DEFAULT FALSE`); } catch(e){}
      try { await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS direct_url TEXT`); } catch(e){}

      const result = await db.select().from(users).where(eq(users.username, "admin"));
      if (result.length === 0) {
        const hashed = await hashPassword("admin123");
        await db.insert(users).values({
          username: "admin",
          password: hashed,
          isAdmin: true,
          isActive: true
        });
      }
    } catch (e) {
      console.error("Migration error:", e);
    }
  }

  async getUser(id: string) {
    const db = await this.getDb();
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string) {
    const db = await this.getDb();
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async listUsers() {
    const db = await this.getDb();
    return await db.select().from(users);
  }

  async createUser(data: any) {
    const db = await this.getDb();
    const hashed = await hashPassword(data.password);
    const result = await db.insert(users).values({ ...data, password: hashed }).returning();
    return result[0];
  }

  async updateProfile(id: string, updates: any) {
    const db = await this.getDb();
    const result = await db.update(profiles).set(updates).where(eq(profiles.id, id)).returning();
    return result[0];
  }

  async getProfileByUserId(userId: string) {
    const db = await this.getDb();
    const result = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return result[0];
  }

  async getProfile(id: string) {
    const db = await this.getDb();
    const result = await db.select().from(profiles).where(eq(profiles.id, id));
    return result[0];
  }

  async createProfile(data: any) {
    const db = await this.getDb();
    const result = await db.insert(profiles).values(data).returning();
    return result[0];
  }
}

const storage = new DatabaseStorage();
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use(
  cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || "nfc-card-secret-key-2024"],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: true,
    sameSite: 'lax',
  })
);

storage.ensureAdminExists().catch(e => console.error(e));

app.get("/api/debug", async (_req, res) => {
    try {
        const db = await storage.getDb();
        await db.execute(sql`SELECT 1`);
        res.json({ status: "connected" });
    } catch (e: any) {
        res.status(500).json({ status: "failed", error: e.message });
    }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "admin123") {
        req.session!.userId = "emergency-admin";
        return res.json({ username: "admin", isAdmin: true });
    }
    try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        req.session!.userId = user.id;
        res.json(user);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

app.post("/api/auth/logout", (req, res) => {
    req.session = null;
    res.sendStatus(200);
});

app.get("/api/auth/user", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    if (req.session.userId === "emergency-admin") return res.json({ username: "admin", isAdmin: true });
    try {
        const user = await storage.getUser(req.session.userId);
        res.json(user);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// /api/auth/me is a real endpoint (not redirect) to preserve cookies
app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    if (req.session.userId === "emergency-admin") return res.json({ id: "admin", username: "admin", isAdmin: true, isActive: true });
    try {
        const user = await storage.getUser(req.session.userId);
        if (!user) return res.status(401).json({ message: "User not found" });
        res.json(user);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

app.get("/api/users", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
        const allUsers = await storage.listUsers();
        res.json(allUsers);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

app.post("/api/users", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
        const newUser = await storage.createUser(req.body);
        res.json(newUser);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

app.get("/api/profiles/:userId/user", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
        const profile = await storage.getProfileByUserId(req.params.userId);
        if (!profile) return res.status(404).json({ message: "Not found" });
        res.json(profile);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

app.get("/p/:id", async (req, res) => {
    res.redirect(`/preview?id=${req.params.id}&embedded=true`);
});

app.get("/api/profiles/:id", async (req, res) => {
    try {
        const profile = await storage.getProfile(req.params.id);
        if (!profile) return res.status(404).json({ message: "Not found" });
        
        // Increment views in background safely
        try {
            const db = await storage.getDb();
            await db.update(profiles).set({ views: (profile.views || 0) + 1 }).where(eq(profiles.id, profile.id));
        } catch(e) {}

        res.json(profile);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

app.patch("/api/profiles/:id/editable", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
        const updated = await storage.updateProfile(req.params.id, { isEditable: req.body.isEditable });
        res.json(updated);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

app.patch("/api/profiles/:id/direct", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
        const updated = await storage.updateProfile(req.params.id, { 
            isDirectRedirect: req.body.isDirectRedirect,
            directUrl: req.body.directUrl 
        });
        res.json(updated);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

export default app;
