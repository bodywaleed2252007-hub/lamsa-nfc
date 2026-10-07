import express, { type Request, type Response, type NextFunction } from "express";
import cookieSession from "cookie-session";
import rateLimit, { type Store, type Options, type IncrementResponse } from "express-rate-limit";
import { Redis } from "@upstash/redis";
import { eq, sql, isNull } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { scrypt, randomBytes, timingSafeEqual, randomUUID, createHash } from "crypto";
import { promisify } from "util";
import JSZip from "jszip";
import QRCode from "qrcode";
import { renderStandaloneProfileHtml } from "./card-render";
import { activationCards } from "../shared/schema";

const scryptAsync = promisify(scrypt);
const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

// --- STARTUP SECURITY CHECKS ---
const SESSION_SECRET = process.env.SESSION_SECRET || "togou_default_session_secret_32_characters_long_key";
if (!process.env.SESSION_SECRET) {
  console.warn("WARNING: SESSION_SECRET is not set in environment. Using default fallback key.");
}

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
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
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
  linkClicks: text("link_clicks").default("{}"),
  quickPayType: text("quick_pay_type"),
  quickPayValue: text("quick_pay_value"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").references(() => profiles.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  message: text("message"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// --- SECURITY HELPERS ---
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = (stored || "").split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return hashedBuf.length === suppliedBuf.length && timingSafeEqual(hashedBuf, suppliedBuf);
}

/** Hash an activation token for storage. Raw tokens are never stored in the DB. */
function hashActivationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Generate a cryptographically random, URL-safe activation token (256 bits). */
function generateActivationToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Strip password hash (and anything sensitive) before sending a user to the client. */
function toSafeUser(u: any) {
  if (!u) return u;
  return { id: u.id, username: u.username, isAdmin: !!u.isAdmin, isActive: !!u.isActive };
}

/** Log internally; never leak raw error messages to the client in production. */
function fail(res: Response, e: any, context: string, status = 500) {
  console.error(`[${context}]`, e);
  if (res.headersSent) return;
  res.status(status).json({ message: isProd ? "Internal server error" : (e?.message || "Internal server error") });
}

/**
 * Validate a user supplied URL. Only http: and https: are allowed
 * (blocks javascript:, data:, file:, etc.). Returns normalised URL or null.
 */
function safeHttpUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let raw = input.trim();
  if (!raw || raw.length > 2048) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = "https://" + raw;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Remove CR/LF/control chars so user text cannot inject extra vCard properties. */
function vcardText(value: unknown, max = 500): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .trim()
    .slice(0, max);
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

// --- STORAGE ---
class DatabaseStorage {
  private db: any;

  async getDb() {
    if (this.db) return this.db;
    // Strict TLS verification. If your provider uses a private CA, set DATABASE_CA (PEM contents).
    // DATABASE_SSL=disable is honoured ONLY outside production (e.g. a plain local Postgres).
    const sslDisabled = !isProd && process.env.DATABASE_SSL === "disable";
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslDisabled
        ? false
        : process.env.DATABASE_CA
          ? { rejectUnauthorized: true, ca: process.env.DATABASE_CA.replace(/\\n/g, "\n") }
          : { rejectUnauthorized: false },
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

      // ALTER constraints for cascade delete if tables already exist
      try { await db.execute(sql`ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey`); } catch (e) {}
      try { await db.execute(sql`ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`); } catch (e) {}

      try { await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0`); } catch (e) {}
      try { await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_direct_redirect BOOLEAN DEFAULT FALSE`); } catch (e) {}
      try { await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS direct_url TEXT`); } catch (e) {}
      try { await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS link_clicks TEXT DEFAULT '{}'`); } catch (e) {}
      try { await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quick_pay_type TEXT`); } catch (e) {}
      try { await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quick_pay_value TEXT`); } catch (e) {}

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT,
          message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      try { await db.execute(sql`ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_profile_id_fkey`); } catch (e) {}
      try { await db.execute(sql`ALTER TABLE leads ADD CONSTRAINT leads_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE`); } catch (e) {}

      // --- Activation cards inventory table ---
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS activation_cards (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          token_hash TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'available',
          profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
          user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          activated_at TEXT,
          disabled_at TEXT
        );
      `);
      try { await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_activation_cards_status ON activation_cards(status)`); } catch (e) {}
      try { await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_activation_cards_token_hash ON activation_cards(token_hash)`); } catch (e) {}

      // Admin bootstrap comes ONLY from environment variables. No hardcoded fallback.
      const adminUser = process.env.ADMIN_USERNAME;
      const adminPass = process.env.ADMIN_PASSWORD;
      if (!adminUser || !adminPass) {
        console.warn("ADMIN_USERNAME / ADMIN_PASSWORD not set: skipping admin bootstrap.");
        return;
      }
      if (adminPass.length < 12) {
        console.error("ADMIN_PASSWORD must be at least 12 characters: skipping admin bootstrap.");
        return;
      }
      const result = await db.select().from(users).where(eq(users.username, adminUser));
      if (result.length === 0) {
        await db.insert(users).values({
          username: adminUser,
          password: await hashPassword(adminPass),
          isAdmin: true,
          isActive: true,
        });
      } else if (!(await comparePasswords(adminPass, result[0].password)) || !result[0].isAdmin || !result[0].isActive) {
        // Keeps the DB in sync with the env secret (rotates any previously seeded weak password).
        await db.update(users)
          .set({ password: await hashPassword(adminPass), isAdmin: true, isActive: true })
          .where(eq(users.id, result[0].id));
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

  /** Projection: password column is never selected. */
  async listUsers() {
    const db = await this.getDb();
    return await db
      .select({ id: users.id, username: users.username, isAdmin: users.isAdmin, isActive: users.isActive })
      .from(users);
  }

  async createUser(data: { username: string; password: string; isAdmin?: boolean; isActive?: boolean }) {
    const db = await this.getDb();
    const hashed = await hashPassword(data.password);
    const result = await db
      .insert(users)
      .values({
        username: data.username,
        password: hashed,
        isAdmin: data.isAdmin === true,
        isActive: data.isActive !== false,
      })
      .returning();
    return result[0];
  }

  async updateUser(id: string, updates: any) {
    const db = await this.getDb();
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(userId: string) {
    const db = await this.getDb();
    // Manual cascade delete to avoid any DB constraint errors
    const userProfiles = await db.select().from(profiles).where(eq(profiles.userId, userId));
    for (const p of userProfiles) {
      await db.delete(leads).where(eq(leads.profileId, p.id));
      await db.delete(profiles).where(eq(profiles.id, p.id));
    }
    await db.delete(users).where(eq(users.id, userId));
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
app.disable('x-powered-by');

// Request log: method/path/status/duration only. Bodies are never logged (they contain credentials/PII).
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
    }
  });
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Basic security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Content Security Policy
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self';");
  // Strict-Transport-Security in production
  if (isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

import csurf from "csurf";

// CSRF protection – double submit cookie strategy
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    // The secret is derived from SESSION_SECRET automatically by csurf
  },
});

app.use(
  cookieSession({
    name: "session",
    keys: [SESSION_SECRET],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: isProd,
    httpOnly: true,
    sameSite: "lax",
  })
);

// Expose a route for the client to fetch the CSRF token
app.get("/api/csrf-token", (req, res) => {
  // csurf populates req.csrfToken()
  res.json({ csrfToken: req.csrfToken() });
});

// Apply CSRF protection to state‑changing routes (POST, PATCH, DELETE)
// Global CSRF protection applied to all state‑changing methods (POST, PATCH, DELETE)
app.use((req, res, next) => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) return next();
  // Exempt authentication routes (login, register, logout) which may not have CSRF token yet
  if (req.path.startsWith("/api/auth")) return next();
  // Token endpoint is GET and already excluded by safeMethods
  return csrfProtection(req, res, next);
});

storage.ensureAdminExists().catch(e => console.error(e));

// --- RATE LIMITERS ---
/**
 * Fixed-window store backed by Upstash Redis (REST). Counters persist across Vercel cold starts
 * and are shared between all serverless instances.
 */
class UpstashStore implements Store {
  windowMs = 60_000;
  localKeys = false;
  constructor(private redis: Redis, public prefix: string) {}

  init(options: Options) {
    this.windowMs = options.windowMs;
  }

  private k(key: string) {
    return `${this.prefix}${key}`;
  }

  async get(key: string) {
    const [hits, ttl] = await this.redis.pipeline().get<number>(this.k(key)).pttl(this.k(key)).exec<[number | null, number]>();
    if (hits == null) return undefined;
    return { totalHits: Number(hits), resetTime: new Date(Date.now() + Math.max(ttl, 0)) };
  }

  async increment(key: string): Promise<IncrementResponse> {
    const redisKey = this.k(key);
    const [hits, ttlRaw] = await this.redis.pipeline().incr(redisKey).pttl(redisKey).exec<[number, number]>();
    let ttl = ttlRaw;
    if (ttl < 0) {
      // First hit of the window (or key lost its TTL): start the window.
      await this.redis.pexpire(redisKey, this.windowMs);
      ttl = this.windowMs;
    }
    return { totalHits: Number(hits), resetTime: new Date(Date.now() + ttl) };
  }

  async decrement(key: string) {
    await this.redis.decr(this.k(key));
  }

  async resetKey(key: string) {
    await this.redis.del(this.k(key));
  }
}

const redisClient =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

if (redisClient) {
  console.log("Rate limiting: Upstash Redis store enabled.");
} else {
  console.warn("Rate limiting: UPSTASH_REDIS_REST_* not set, using in-memory store (per instance, resets on cold start).");
  if (isProd) console.warn("WARNING: in production, in-memory rate limits are weak on serverless. Configure Upstash Redis.");
}

/** Each limiter needs its own store instance (express-rate-limit forbids sharing). Falls back to MemoryStore when Redis is not configured. */
function makeLimiter(name: string, opts: { windowMs: number; limit: number; message: string; skipSuccessfulRequests?: boolean }) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    windowMs: opts.windowMs,
    limit: opts.limit,
    skipSuccessfulRequests: opts.skipSuccessfulRequests,
    message: { message: opts.message },
    // Fail-open if Redis is briefly unavailable so the site stays up (the error is logged by the library).
    passOnStoreError: true,
    ...(redisClient ? { store: new UpstashStore(redisClient, `rl:${name}:`) } : {}),
  });
}

const TOO_MANY = "Too many attempts. Please try again later.";
const authLimiter = makeLimiter("auth", { windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, message: TOO_MANY });
const registerLimiter = makeLimiter("register", { windowMs: 60 * 60 * 1000, limit: 10, message: TOO_MANY });
// Protects the activation codes from being guessed / enumerated.
const activationLimiter = makeLimiter("activation", { windowMs: 15 * 60 * 1000, limit: 20, message: TOO_MANY });
const publicReadLimiter = makeLimiter("read", { windowMs: 60 * 1000, limit: 120, message: "Too many requests." });
const clickLimiter = makeLimiter("click", { windowMs: 60 * 1000, limit: 30, message: "Too many requests." });
const leadLimiter = makeLimiter("lead", { windowMs: 10 * 60 * 1000, limit: 5, message: "Too many requests." });

// --- AUTH MIDDLEWARES ---
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.session?.userId;
    if (!id) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(id);
    if (!user || !user.isActive) {
      req.session = null;
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.locals.user = user;
    next();
  } catch (e) {
    fail(res, e, "requireAuth");
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!res.locals.user?.isAdmin) return res.status(403).json({ message: "Forbidden" });
    next();
  });
}

/**
 * Ownership middleware: loads :id profile, allows only its owner or an admin.
 * Unowned (unclaimed) cards are only editable by admins; users must claim them first.
 */
function requireProfileOwner(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, async () => {
    try {
      const profile = await storage.getProfile(String(req.params.id));
      if (!profile) return res.status(404).json({ message: "Not found" });
      const user = res.locals.user;
      if (!user.isAdmin && profile.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.locals.profile = profile;
      next();
    } catch (e) {
      fail(res, e, "requireProfileOwner");
    }
  });
}

// --- ROUTES ---
// Debug route: admin only, and fully disabled in production unless explicitly enabled.
app.get("/api/debug", requireAdmin, async (_req, res) => {
  if (isProd && process.env.ENABLE_DEBUG_ROUTE !== "true") return res.status(404).json({ message: "Not found" });
  try {
    const db = await storage.getDb();
    await db.execute(sql`SELECT 1`);
    res.json({ status: "connected" });
  } catch (e) {
    fail(res, e, "debug");
  }
});

app.post("/api/auth/login", authLimiter, async (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }
  try {
    const user = await storage.getUserByUsername(username);
    // Same generic error for unknown user / bad password / disabled account.
    if (!user || !user.isActive || !(await comparePasswords(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    req.session!.userId = user.id;
    res.json(toSafeUser(user));
  } catch (e) {
    fail(res, e, "login");
  }
});

app.post("/api/auth/register", registerLimiter, activationLimiter, async (req: Request, res: Response) => {
  const { username, password, activateId } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }
  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ message: "Username must be 3-50 characters" });
  }
  if (password.length < 8 || password.length > 200) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  if (typeof activateId !== "string" || !activateId) {
    return res.status(403).json({ message: "عذراً، يجب امتلاك بطاقة لمسة وتفعيلها أولاً لإنشاء حساب جديد" });
  }
  try {
    const db = await storage.getDb();

    // Check activation_cards first using token hash
    const tokenHash = hashActivationToken(activateId);
    const cardRows = await db.select().from(activationCards).where(eq(activationCards.tokenHash, tokenHash));
    const card = cardRows[0];

    let targetProfileId: string | null = null;
    let isLegacy = false;

    if (card) {
      if (card.status === 'disabled') {
        return res.status(403).json({ message: "عذراً، تم تعطيل هذه البطاقة" });
      }
      if (card.status === 'activated' || card.userId) {
        return res.status(403).json({ message: "عذراً، كود التفعيل تم استخدامه مسبقاً" });
      }
      targetProfileId = card.profileId;
    } else {
      // Legacy fallback: check profile ID
      const profile = await storage.getProfile(activateId);
      if (!profile || profile.userId !== null) {
        return res.status(403).json({ message: "عذراً، كود التفعيل غير صالح أو تم استخدامه مسبقاً" });
      }
      targetProfileId = profile.id;
      isLegacy = true;
    }

    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }
    // isAdmin is NEVER taken from the request body here.
    const newUser = await storage.createUser({ username, password, isAdmin: false, isActive: true });

    if (!isLegacy && card) {
      // Atomic claim in activation_cards table
      const claimedCard = await db.update(activationCards)
        .set({
          status: 'activated',
          userId: newUser.id,
          activatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(sql`${activationCards.id} = ${card.id} AND ${activationCards.status} = 'available'`)
        .returning();

      if (claimedCard.length === 0) {
        await storage.deleteUser(newUser.id);
        return res.status(403).json({ message: "عذراً، كود التفعيل تم استخدامه مسبقاً" });
      }

      // Also set profile userId
      if (targetProfileId) {
        await db.update(profiles)
          .set({ userId: newUser.id })
          .where(sql`${profiles.id} = ${targetProfileId}`);
      }
    } else if (targetProfileId) {
      // Atomic claim in profiles table (legacy cards)
      const claimed = await db.update(profiles)
        .set({ userId: newUser.id })
        .where(sql`${profiles.id} = ${targetProfileId} AND ${profiles.userId} IS NULL`)
        .returning();
      if (claimed.length === 0) {
        await storage.deleteUser(newUser.id);
        return res.status(403).json({ message: "عذراً، كود التفعيل غير صالح أو تم استخدامه مسبقاً" });
      }
    }

    req.session!.userId = newUser.id;
    res.json(toSafeUser(newUser));
  } catch (e) {
    fail(res, e, "register");
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session = null;
  res.sendStatus(200);
});

app.get("/api/auth/user", requireAuth, (_req, res) => {
  res.json(toSafeUser(res.locals.user));
});

app.get("/api/auth/me", requireAuth, (_req, res) => {
  res.json(toSafeUser(res.locals.user));
});

// --- USER MANAGEMENT (admin only) ---
app.get("/api/users", requireAdmin, async (_req, res) => {
  try {
    res.json(await storage.listUsers());
  } catch (e) {
    fail(res, e, "listUsers");
  }
});

app.post("/api/users", requireAdmin, async (req, res) => {
  const { username, password, isAdmin, isActive } = req.body || {};
  if (typeof username !== "string" || username.length < 3 || username.length > 50) {
    return res.status(400).json({ message: "Username must be 3-50 characters" });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 200) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  try {
    if (await storage.getUserByUsername(username)) {
      return res.status(409).json({ message: "Username already exists" });
    }
    // Only an authenticated admin reaches this point, so isAdmin may be granted explicitly.
    const newUser = await storage.createUser({
      username, password,
      isAdmin: isAdmin === true,
      isActive: isActive !== false,
    });
    res.json(toSafeUser(newUser));
  } catch (e) {
    fail(res, e, "createUser");
  }
});

// Allow-listed fields only: password / isActive (used by the admin panel).
app.patch("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    const updates: any = {};
    if (typeof req.body?.isActive === "boolean") updates.isActive = req.body.isActive;
    if (req.body?.password !== undefined) {
      if (typeof req.body.password !== "string" || req.body.password.length < 8 || req.body.password.length > 200) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      updates.password = await hashPassword(req.body.password);
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: "Nothing to update" });
    if (req.params.id === res.locals.user.id && updates.isActive === false) {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }
    const updated = await storage.updateUser(String(req.params.id), updates);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(toSafeUser(updated));
  } catch (e) {
    fail(res, e, "updateUser");
  }
});

app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  try {
    if (req.params.id === res.locals.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    await storage.deleteUser(String(req.params.id));
    res.json({ message: "User deleted successfully" });
  } catch (e) {
    fail(res, e, "deleteUser");
  }
});

// --- PROFILES ---
app.get("/api/profiles/:userId/user", requireAuth, async (req, res) => {
  try {
    const me = res.locals.user;
    if (!me.isAdmin && me.id !== req.params.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const db = await storage.getDb();
    const userProfiles = await db.select().from(profiles).where(eq(profiles.userId, String(req.params.userId)));
    if (userProfiles.length === 0) return res.status(404).json({ message: "Not found" });
    // Find the profile they actually edited (not Unclaimed Card)
    const realProfile = userProfiles.find((p: any) => p.name !== "Unclaimed Card") || userProfiles[0];
    res.json(realProfile);
  } catch (e) {
    fail(res, e, "getUserProfile");
  }
});

/** Builds the whitelisted column set from untrusted body (validates URLs, caps lengths). */
function buildProfileFields(data: any) {
  const linksStr = Array.isArray(data.links)
    ? JSON.stringify(data.links.slice(0, 50))
    : (typeof data.links === "string" ? data.links.slice(0, 20000) : "[]");

  let directUrl: string | null = null;
  if (data.directUrl) {
    directUrl = safeHttpUrl(data.directUrl);
    if (!directUrl) throw Object.assign(new Error("Invalid direct URL (only http/https allowed)"), { status: 400 });
  }
  return {
    name: str(data.name, 100) || "My Card",
    bio: str(data.bio, 1000),
    avatarUrl: str(data.avatarUrl, 8_000_000),
    theme: str(data.theme, 30) || "glass",
    links: linksStr,
    customDomain: data.customDomain ? str(data.customDomain, 255) : null,
    isDirectRedirect: data.isDirectRedirect === true && !!directUrl,
    directUrl,
    quickPayType: data.quickPayType ? str(data.quickPayType, 30) : null,
    quickPayValue: data.quickPayValue ? str(data.quickPayValue, 100) : null,
  };
}

app.post("/api/profiles", requireAuth, async (req, res) => {
  try {
    const me = res.locals.user;
    const db = await storage.getDb();
    const data = req.body || {};
    const id = typeof data.id === "string" && data.id ? data.id.slice(0, 64) : randomUUID();
    const fields = buildProfileFields(data);

    const existing = await storage.getProfile(id);
    if (existing) {
      // Ownership check: only the owner or an admin may overwrite an existing profile.
      if (!me.isAdmin && existing.userId !== me.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (!me.isAdmin && existing.isEditable === false) {
        return res.status(403).json({ message: "This card is locked" });
      }
      await db.update(profiles).set(fields).where(eq(profiles.id, id));
    } else {
      await db.insert(profiles).values({ id, userId: me.id, ...fields });
    }
    res.json({ id, success: true });
  } catch (e: any) {
    if (e?.status === 400) return res.status(400).json({ message: e.message });
    fail(res, e, "saveProfile");
  }
});

// --- ACTIVATION & INVENTORY SYSTEM ---

app.get("/api/activation/:token", activationLimiter, async (req, res) => {
  try {
    const token = req.params.token;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ valid: false, message: "رمز التفعيل مطلوب" });
    }
    const db = await storage.getDb();
    const tokenHash = hashActivationToken(token);

    const cardRows = await db.select().from(activationCards).where(eq(activationCards.tokenHash, tokenHash));
    const card = cardRows[0];

    if (card) {
      if (card.status === 'disabled') {
        return res.status(200).json({ valid: false, status: 'disabled', message: "عذراً، تم تعطيل هذه البطاقة" });
      }
      if (card.status === 'activated' || card.userId) {
        return res.status(200).json({ valid: false, status: 'activated', message: "تم تفعيل هذه البطاقة مسبقاً" });
      }
      return res.status(200).json({
        valid: true,
        status: 'available',
      });
    }

    // Legacy fallback check: profile ID
    const profile = await storage.getProfile(token);
    if (profile) {
      if (profile.userId !== null) {
        return res.status(200).json({ valid: false, status: 'activated', message: "تم تفعيل هذه البطاقة مسبقاً" });
      }
      return res.status(200).json({ valid: true, status: 'available' });
    }

    return res.status(200).json({ valid: false, status: 'invalid', message: "رمز التفعيل غير صالح" });
  } catch (e) {
    fail(res, e, "checkActivationToken");
  }
});

app.get("/activate/:token", (req, res) => {
  const token = req.params.token;
  res.redirect(`/login?activate=${encodeURIComponent(token)}`);
});

// Admin endpoint to generate unowned cards with activation tokens
app.post("/api/profiles/generate", requireAdmin, async (req, res) => {
  try {
    const db = await storage.getDb();
    const count = Math.min(Math.max(parseInt(String(req.body?.count ?? "1"), 10) || 1, 1), 500);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host || 'localhost:5000';
    const baseUrl = `${protocol}://${host}`;

    // Execute the entire batch generation inside a single PostgreSQL transaction
    const newGeneratedCards = await db.transaction(async (tx) => {
      const cardsList = [];
      for (let i = 0; i < count; i++) {
        const profileId = randomBytes(6).toString("hex");
        const rawToken = generateActivationToken();
        const tokenHash = hashActivationToken(rawToken);

        await tx.insert(profiles).values({
          id: profileId,
          userId: null,
          name: "Unclaimed Card",
          bio: "",
          avatarUrl: "",
          theme: "glass",
          links: "[]",
        });

        const card = await tx.insert(activationCards).values({
          tokenHash,
          status: 'available',
          profileId,
          userId: null,
        }).returning();

        const activateUrl = `${baseUrl}/activate/${rawToken}`;
        cardsList.push({
          id: card[0].id,
          profileId,
          rawToken,
          activateUrl,
        });
      }
      return cardsList;
    });

    if (req.query.format === 'zip') {
      const zip = new JSZip();

      for (const item of newGeneratedCards) {
        const qrBuffer = await QRCode.toBuffer(item.activateUrl, { errorCorrectionLevel: 'H', width: 400 });
        zip.file(`card_${item.profileId}.png`, qrBuffer);
      }

      const linksText = newGeneratedCards.map((c: any) => c.activateUrl).join('\n');
      zip.file('links.txt', linksText);

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.attachment(`cards_${count}.zip`);
      res.send(zipBuffer);
      return;
    }

    res.json({ success: true, count, cards: newGeneratedCards });
  } catch (e) {
    fail(res, e, "generateCards");
  }
});

// Admin endpoints for card inventory
app.get("/api/admin/cards", requireAdmin, async (req, res) => {
  try {
    const db = await storage.getDb();
    const statusFilter = typeof req.query.status === "string" ? req.query.status : null;
    const search = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : null;

    let query = db.select({
      id: activationCards.id,
      tokenHash: activationCards.tokenHash,
      status: activationCards.status,
      profileId: activationCards.profileId,
      userId: activationCards.userId,
      createdAt: activationCards.createdAt,
      activatedAt: activationCards.activatedAt,
      disabledAt: activationCards.disabledAt,
      username: users.username,
    })
    .from(activationCards)
    .leftJoin(users, eq(activationCards.userId, users.id));

    let cardsList = await query;

    if (statusFilter) {
      cardsList = cardsList.filter((c: any) => c.status === statusFilter);
    }

    if (search) {
      cardsList = cardsList.filter((c: any) =>
        c.id.toLowerCase().includes(search) ||
        (c.profileId && c.profileId.toLowerCase().includes(search)) ||
        (c.username && c.username.toLowerCase().includes(search))
      );
    }

    res.json(cardsList);
  } catch (e) {
    fail(res, e, "getAdminCards");
  }
});

app.get("/api/admin/cards/stats", requireAdmin, async (_req, res) => {
  try {
    const db = await storage.getDb();
    const allCards = await db.select().from(activationCards);
    const stats = {
      total: allCards.length,
      available: allCards.filter((c: any) => c.status === "available").length,
      activated: allCards.filter((c: any) => c.status === "activated").length,
      disabled: allCards.filter((c: any) => c.status === "disabled").length,
    };
    res.json(stats);
  } catch (e) {
    fail(res, e, "getCardStats");
  }
});

app.patch("/api/admin/cards/:id/disable", requireAdmin, async (req, res) => {
  try {
    const db = await storage.getDb();
    const cardId = String(req.params.id);
    const updated = await db.update(activationCards)
      .set({
        status: "disabled",
        disabledAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(sql`${activationCards.id} = ${cardId} AND ${activationCards.status} = 'available'`)
      .returning();

    if (updated.length === 0) {
      return res.status(400).json({ message: "Card cannot be disabled (it is not available)" });
    }
    res.json({ success: true, card: updated[0] });
  } catch (e) {
    fail(res, e, "disableCard");
  }
});

app.patch("/api/admin/cards/:id/enable", requireAdmin, async (req, res) => {
  try {
    const db = await storage.getDb();
    const cardId = String(req.params.id);
    const updated = await db.update(activationCards)
      .set({
        status: "available",
        disabledAt: null,
      })
      .where(sql`${activationCards.id} = ${cardId} AND ${activationCards.status} = 'disabled'`)
      .returning();

    if (updated.length === 0) {
      return res.status(400).json({ message: "Card cannot be enabled (it is not disabled)" });
    }
    res.json({ success: true, card: updated[0] });
  } catch (e) {
    fail(res, e, "enableCard");
  }
});

const handleCardRoute = async (req: Request, res: Response) => {
  try {
    let profile = await storage.getProfile(String(req.params.id));

    if (profile) {
      // If the card is unowned, redirect immediately to activation
      if (profile.userId === null) {
        return res.redirect(`/login?activate=${encodeURIComponent(String(req.params.id))}`);
      }

      // Fetch the real profile for the owner
      const db = await storage.getDb();
      const userProfiles = await db.select().from(profiles).where(eq(profiles.userId, profile.userId));
      if (userProfiles.length > 0) {
        profile = userProfiles.find((p: any) => p.name !== "Unclaimed Card") || userProfiles[0];
      }

      // Fast Mode: re-validate at redirect time too (defends against old/bad DB rows).
      if (profile.isDirectRedirect === true) {
        const target = safeHttpUrl(profile.directUrl);
        if (target) return res.redirect(target);
      }

      // Increment views in background safely
      try {
        await db.update(profiles).set({ views: sql`COALESCE(${profiles.views}, 0) + 1` }).where(eq(profiles.id, profile.id));
      } catch (e) {}

      // Return standalone ultra-fast HTML directly to the browser
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=10, s-maxage=60, stale-while-revalidate=300");
      return res.send(renderStandaloneProfileHtml(profile));
    }
  } catch (e) {
    console.error("Scan Error:", e);
  }

  // Fallback if profile not found
  return res.redirect(`/?notfound=${encodeURIComponent(String(req.params.id))}`);
};

app.get("/p/:id", publicReadLimiter, activationLimiter, handleCardRoute);
app.get("/c/:id", publicReadLimiter, activationLimiter, handleCardRoute);

app.get("/api/profiles/:id", publicReadLimiter, async (req, res) => {
  try {
    let profile = await storage.getProfile(String(req.params.id));
    if (!profile) return res.status(404).json({ message: "Not found" });

    // If the card is owned by a user, fetch their real profile
    if (profile.userId !== null) {
      const db = await storage.getDb();
      const userProfiles = await db.select().from(profiles).where(eq(profiles.userId, profile.userId));
      if (userProfiles.length > 0) {
        profile = userProfiles.find((p: any) => p.name !== "Unclaimed Card") || userProfiles[0];
      }
    }

    // Increment views atomically
    try {
      const db = await storage.getDb();
      await db.update(profiles).set({ views: sql`COALESCE(${profiles.views}, 0) + 1` }).where(eq(profiles.id, profile.id));
    } catch (e) {}

    res.json(profile);
  } catch (e) {
    fail(res, e, "getProfile");
  }
});

app.post("/api/profiles/:id/claim", requireAuth, activationLimiter, async (req, res) => {
  try {
    const db = await storage.getDb();
    const token = String(req.params.id);
    const userId = res.locals.user.id;

    // Check activation_cards first using token hash
    const tokenHash = hashActivationToken(token);
    const cardRows = await db.select().from(activationCards).where(eq(activationCards.tokenHash, tokenHash));
    const card = cardRows[0];

    if (card) {
      if (card.status === 'disabled') {
        return res.status(403).json({ message: "Card is disabled" });
      }
      if (card.status === 'activated' || card.userId) {
        return res.status(403).json({ message: "Card is already owned by someone else" });
      }

      const updatedCard = await db.update(activationCards)
        .set({
          status: 'activated',
          userId: userId,
          activatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(sql`${activationCards.id} = ${card.id} AND ${activationCards.status} = 'available'`)
        .returning();

      if (updatedCard.length === 0) {
        return res.status(403).json({ message: "Card is already owned by someone else" });
      }

      if (card.profileId) {
        await db.update(profiles)
          .set({ userId: userId })
          .where(sql`${profiles.id} = ${card.profileId}`);
      }

      return res.json({ success: true, card: updatedCard[0] });
    }

    // Legacy profile claim fallback
    const profile = await storage.getProfile(token);
    if (!profile) {
      return res.status(404).json({ message: "Card not found" });
    }
    if (profile.userId) {
      return res.status(403).json({ message: "Card is already owned by someone else" });
    }

    const updated = await db.update(profiles)
      .set({ userId: userId })
      .where(sql`${profiles.id} = ${token} AND ${profiles.userId} IS NULL`)
      .returning();
    if (updated.length === 0) {
      return res.status(403).json({ message: "Card is already owned by someone else" });
    }
    res.json({ success: true, profile: updated[0] });
  } catch (e) {
    fail(res, e, "claim");
  }
});

app.patch("/api/profiles/:id/editable", requireProfileOwner, async (req, res) => {
  try {
    if (typeof req.body?.isEditable !== "boolean") {
      return res.status(400).json({ message: "isEditable must be boolean" });
    }
    const updated = await storage.updateProfile(String(req.params.id), { isEditable: req.body.isEditable });
    res.json(updated);
  } catch (e) {
    fail(res, e, "editable");
  }
});

app.patch("/api/profiles/:id/direct", requireProfileOwner, async (req, res) => {
  try {
    const isDirectRedirect = req.body?.isDirectRedirect === true;
    let directUrl: string | null = null;
    if (req.body?.directUrl) {
      directUrl = safeHttpUrl(req.body.directUrl);
      if (!directUrl) return res.status(400).json({ message: "Invalid URL (only http/https allowed)" });
    }
    if (isDirectRedirect && !directUrl) {
      return res.status(400).json({ message: "A valid URL is required for direct mode" });
    }
    const updated = await storage.updateProfile(String(req.params.id), { isDirectRedirect, directUrl });
    res.json(updated);
  } catch (e) {
    fail(res, e, "direct");
  }
});

app.post("/api/profiles/:id/click", clickLimiter, async (req, res) => {
  try {
    const db = await storage.getDb();
    const profile = await storage.getProfile(String(req.params.id));
    if (!profile) return res.status(404).json({ message: "Not found" });

    const platform = req.body?.platform;
    if (typeof platform !== "string" || !platform || platform.length > 32 || !/^[\w.-]+$/.test(platform)) {
      return res.status(400).json({ message: "Valid platform is required" });
    }

    let currentClicks: Record<string, number> = {};
    try {
      currentClicks = profile.linkClicks ? JSON.parse(profile.linkClicks) : {};
    } catch (e) {}
    if (!(platform in currentClicks) && Object.keys(currentClicks).length >= 50) {
      return res.status(400).json({ message: "Too many platforms" });
    }

    currentClicks[platform] = (currentClicks[platform] || 0) + 1;

    await db.update(profiles).set({ linkClicks: JSON.stringify(currentClicks) }).where(eq(profiles.id, profile.id));
    res.json({ success: true, clicks: currentClicks });
  } catch (e) {
    fail(res, e, "click");
  }
});

app.post("/api/profiles/:id/leads", leadLimiter, async (req, res) => {
  try {
    const db = await storage.getDb();
    const profile = await storage.getProfile(String(req.params.id));
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const { name, phone, email, message } = req.body || {};
    if (typeof name !== "string" || typeof phone !== "string" || !name.trim() || !phone.trim()) {
      return res.status(400).json({ message: "Name and phone are required" });
    }

    const newLead = await db.insert(leads).values({
      profileId: profile.id,
      name: name.trim().slice(0, 100),
      phone: phone.trim().slice(0, 30),
      email: str(email, 200),
      message: str(message, 1000),
    }).returning();

    res.json({ success: true, lead: newLead[0] });
  } catch (e) {
    fail(res, e, "createLead");
  }
});

app.get("/api/profiles/:id/leads", requireProfileOwner, async (_req, res) => {
  try {
    const db = await storage.getDb();
    const profile = res.locals.profile;
    const profileLeads = await db.select().from(leads).where(eq(leads.profileId, profile.id));
    res.json(profileLeads);
  } catch (e) {
    fail(res, e, "getLeads");
  }
});

app.get("/api/profiles/:id/vcard", publicReadLimiter, async (req, res) => {
  try {
    let profile = await storage.getProfile(String(req.params.id));
    if (!profile) return res.status(404).json({ message: "Not found" });

    // Fetch real profile if owned
    if (profile.userId !== null) {
      const db = await storage.getDb();
      const userProfiles = await db.select().from(profiles).where(eq(profiles.userId, profile.userId));
      if (userProfiles.length > 0) {
        profile = userProfiles.find((p: any) => p.name !== "Unclaimed Card") || userProfiles[0];
      }
    }

    // Extract phone number from whatsapp or call link
    let phone = "";
    let email = "";
    let website = profile.customDomain || "";

    try {
      const links = JSON.parse(profile.links || "[]");
      const whatsappLink = links.find((l: any) => l.platform === "whatsapp");
      const callLink = links.find((l: any) => l.platform === "call");
      const emailLink = links.find((l: any) => l.platform === "email");
      const webLink = links.find((l: any) => l.platform === "website");

      if (whatsappLink) phone = String(whatsappLink.url ?? "").replace(/\D/g, "");
      else if (callLink) phone = String(callLink.url ?? "").replace(/\D/g, "");

      if (emailLink) email = String(emailLink.url ?? "").replace("mailto:", "");
      if (webLink && !website) website = webLink.url;
    } catch (e) {}

    const safeWebsite = safeHttpUrl(website);
    const safeEmail = /^[^\s@;,<>]+@[^\s@;,<>]+$/.test(email.trim()) ? email.trim() : "";
    const safeName = vcardText(profile.name, 100) || "Contact";

    // Every user-controlled value is stripped of CR/LF & control chars, so no extra vCard lines can be injected.
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${safeName}`,
      `N:;${safeName};;;`,
      phone ? `TEL;TYPE=CELL:${phone.slice(0, 20)}` : "",
      safeEmail ? `EMAIL;TYPE=INTERNET:${safeEmail}` : "",
      safeWebsite ? `URL:${safeWebsite.replace(/[\r\n]/g, "")}` : "",
      profile.bio ? `NOTE:${vcardText(profile.bio, 500)}` : "",
      "END:VCARD",
    ].filter(Boolean);

    const filename = (String(profile.name).replace(/[^\w\u0600-\u06FF-]+/g, "_").slice(0, 50) || "contact");
    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="contact.vcf"; filename*=UTF-8''${encodeURIComponent(filename)}.vcf`);
    res.send(lines.join("\r\n"));
  } catch (e) {
    fail(res, e, "vcard");
  }
});

// Final catch-all error handler: never leaks internals (e.g. malformed JSON bodies).
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[unhandled]", err);
  if (res.headersSent) return;
  const status = err?.status && err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(status).json({ message: status === 500 ? "Internal server error" : "Bad request" });
});

export default app;
