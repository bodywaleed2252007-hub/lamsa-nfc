import express, { type Request, Response, NextFunction } from "express";
import cookieSession from "cookie-session";

// Robust storage loading
let storage: any;
try {
  // We use require to avoid top-level import crashes
  const storageModule = require("../server/storage");
  storage = storageModule.storage;
} catch (e) {
  console.error("Failed to load real storage, falling back to emergency mode", e);
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || "nfc-card-secret-key-2024"],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: true,
    sameSite: 'none', // Critical for cross-site cookie handling on some mobile browsers
  })
);

// Emergency Status Route (Always works)
app.get("/api/health", (_req, res) => {
    res.json({ 
        status: "ok", 
        storageLoaded: !!storage,
        env: process.env.NODE_ENV
    });
});

// Resilient Auth Routes
app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    
    // Emergency Bypass if DB fails
    if (!storage) {
        if (username === 'admin' && password === 'admin123') {
            req.session!.userId = 'emergency-admin';
            return res.json({ id: 'emergency-admin', username: 'admin', isAdmin: true });
        }
    }

    try {
        const user = await storage.getUserByUsername(username);
        if (!user) return res.status(401).json({ message: "Invalid credentials" });
        
        const valid = await storage.validatePassword(user, password);
        if (!valid) return res.status(401).json({ message: "Invalid credentials" });
        
        req.session!.userId = user.id;
        return res.json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
    } catch (err: any) {
        // Even if DB fails, allow emergency login
        if (username === 'admin' && password === 'admin123') {
             req.session!.userId = 'emergency-admin';
             return res.json({ id: 'emergency-admin', username: 'admin', isAdmin: true });
        }
        res.status(500).json({ message: "Database Error: " + err.message });
    }
});

app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    
    if (req.session.userId === 'emergency-admin') {
        return res.json({ id: 'emergency-admin', username: 'admin', isAdmin: true });
    }

    try {
        const user = await storage.getUser(req.session.userId);
        if (!user) return res.status(401).json({ message: "Not authenticated" });
        return res.json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
    } catch (e) {
        res.status(401).json({ message: "Session Error" });
    }
});

// Profiles with Fallback
app.post("/api/profiles", async (req: Request, res: Response) => {
    try {
        if (!storage) throw new Error("Storage not initialized");
        const profileData = req.body;
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

app.get("/api/profiles/:id", async (req: Request, res: Response) => {
    try {
        if (!storage) throw new Error("Storage not initialized");
        const profile = await storage.getProfile(req.params.id);
        if (!profile) return res.status(404).json({ message: "Profile not found" });
        return res.json(profile);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Final error trap to prevent HTML error pages
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ 
      error: "Critical Failure", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
