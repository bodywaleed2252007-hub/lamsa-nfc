import express, { type Request, Response, NextFunction } from "express";
import cookieSession from "cookie-session";
import { storage } from "../server/storage";
import { users, profiles, type InsertProfile } from "../shared/schema";
import { eq } from "drizzle-orm";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || "nfc-card-secret-key-2024"],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    secure: process.env.NODE_ENV === "production",
    sameSite: 'lax',
  })
);

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
});

// Real Auth Routes
app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const valid = await storage.validatePassword(user, password);
        if (!valid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        req.session!.userId = user.id;
        return res.json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    return res.json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session = null;
    res.json({ message: "Logged out" });
});

// Profile / Short Link Routes
app.get("/api/profiles/:id", async (req: Request, res: Response) => {
    try {
        const profile = await storage.getProfile(req.params.id);
        if (!profile) return res.status(404).json({ message: "Profile not found" });
        return res.json(profile);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

app.post("/api/profiles", async (req: Request, res: Response) => {
    try {
        const profileData = req.body;
        // Generate a short ID if not provided
        const shortId = Math.random().toString(36).substring(2, 9);
        const newProfile = await storage.createProfile({
            ...profileData,
            id: shortId,
            links: JSON.stringify(profileData.links || [])
        });
        res.json(newProfile);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

export default app;
