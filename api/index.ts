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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Initialize database admin
if (storage) {
  storage.ensureAdminExists().catch((err: any) => console.error("DB Init Error:", err));
}


app.use(
  cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || "nfc-card-secret-key-2024"],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: true,
    sameSite: 'none', // Critical for cross-site cookie handling on some mobile browsers
  })
);

// Debug Route to verify DB status
app.get("/api/debug", async (_req, res) => {
  const status: any = {
    env: process.env.NODE_ENV,
    hasDbUrl: !!process.env.DATABASE_URL,
    storageType: storage?.constructor?.name,
  };
  
  if (storage && process.env.DATABASE_URL) {
    try {
      const db = await storage.getDb();
      await db.execute(sql`SELECT 1`);
      status.dbConnection = "Connected ✅";
      
      const userCount = await storage.listUsers();
      status.totalUsers = userCount.length;
    } catch (e: any) {
      status.dbConnection = "Failed ❌: " + e.message;
    }
  }
  
  res.json(status);
});

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

app.get("/api/users", async (req: Request, res: Response) => {
  if (!req.session?.userId) return res.status(401).send("Unauthorized");

  let isAdmin = false;
  if (req.session.userId === 'emergency-admin') {
    isAdmin = true;
  } else {
    const user = await storage.getUser(req.session.userId);
    isAdmin = !!user?.isAdmin;
  }

  if (!isAdmin) return res.status(403).send("Forbidden");

  try {
    const allUsers = await storage.listUsers();
    const usersWithProfiles = await Promise.all(allUsers.map(async (u) => {
      const profile = await storage.getProfileByUserId(u.id);
      return {
        id: u.id,
        username: u.username,
        isAdmin: u.isAdmin,
        isActive: u.isActive,
        profileId: profile?.id,
        isProfileEditable: profile?.isEditable
      };
    }));
    res.json(usersWithProfiles);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// Short URL Redirect (/p/id)
app.get("/p/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  res.redirect(`/preview?id=${id}&embedded=true`);
});

app.post("/api/users", async (req: Request, res: Response) => {
  if (!req.session?.userId) return res.status(401).send("Unauthorized");

  try {
    let isAdmin = false;
    if (req.session.userId === 'emergency-admin') {
      isAdmin = true;
    } else {
      const user = await Promise.race([
        storage.getUser(req.session.userId),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout checking admin status")), 5000))
      ]);
      isAdmin = !!(user as any)?.isAdmin;
    }

    if (!isAdmin) return res.status(403).send("Forbidden");

    const { username, password, isAdmin: newUserIsAdmin, isActive } = req.body;

    const newUser = await storage.createUser({
      username,
      password,
      isAdmin: !!newUserIsAdmin,
      isActive: isActive !== undefined ? isActive : true
    });

    console.log("User created successfully:", newUser.username);
    res.json(newUser);
  } catch (e: any) {
    console.error("CRITICAL ERROR creating user:", e);
    res.status(500).json({
      message: "حدث خطأ أثناء الحفظ في قاعدة البيانات. تأكد من أن اسم المستخدم غير مكرر.",
      debug: e.message
    });
  }
});

app.patch("/api/users/:id", async (req: Request, res: Response) => {
  if (!req.session?.userId) return res.status(401).send("Unauthorized");

  let isAdmin = false;
  if (req.session.userId === 'emergency-admin') {
    isAdmin = true;
  } else {
    const user = await storage.getUser(req.session.userId);
    isAdmin = !!user?.isAdmin;
  }

  if (!isAdmin) return res.status(403).send("Forbidden");

  const updates = req.body;
  try {
    const updated = await storage.updateUser(req.params.id, updates);
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

app.delete("/api/users/:id", async (req: Request, res: Response) => {
  if (!req.session?.userId) return res.status(401).send("Unauthorized");

  let isAdmin = false;
  if (req.session.userId === 'emergency-admin') {
    isAdmin = true;
  } else {
    const user = await storage.getUser(req.session.userId);
    isAdmin = !!user?.isAdmin;
  }

  if (!isAdmin) return res.status(403).send("Forbidden");

  try {
    await storage.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
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

// Admin toggle for editability
app.patch("/api/profiles/:id/editable", async (req: Request, res: Response) => {
  if (!req.session?.userId) return res.status(401).send("Unauthorized");
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) return res.status(403).send("Forbidden");

    const { isEditable } = req.body;
    const updated = await storage.updateProfile(req.params.id, { isEditable });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

app.post("/api/profiles", async (req: Request, res: Response) => {
  try {
    if (!storage) throw new Error("Storage not initialized");
    const profileData = req.body;
    const userId = req.session?.userId;

    if (!userId) return res.status(401).json({ message: "Login required" });

    // Check if user already has a profile
    const existing = await storage.getProfileByUserId(userId);

    if (existing) {
      // Check if it's currently editable
      if (!existing.isEditable) {
        return res.status(403).json({ message: "التعديل مغلق حالياً، يرجى التواصل مع الإدارة" });
      }
      // Update existing
      const updated = await storage.updateProfile(existing.id, {
        ...profileData,
        links: JSON.stringify(profileData.links || [])
      });
      return res.json(updated);
    }

    // Create new
    const shortId = Math.random().toString(36).substring(2, 9);
    
    // FINAL CHECK: Does this user REALLY have no profile? (Double check for safety)
    const doubleCheck = await storage.getProfileByUserId(userId);
    if (doubleCheck) {
        return res.status(400).json({ message: "لديك بطاقة بالفعل، يمكنك تعديلها فقط" });
    }

    try {
      const newProfile = await storage.createProfile({
        ...profileData,
        id: shortId,
        userId: userId === 'emergency-admin' ? null : userId,
        links: JSON.stringify(profileData.links || []),
        isEditable: true
      });
      res.json(newProfile);
    } catch (createErr: any) {
      console.error("Critical Profile Creation Error:", createErr);
      res.status(500).json({ message: "فشل إنشاء البطاقة في قاعدة البيانات: " + createErr.message });
    }
  } catch (err: any) {
    res.status(500).json({ message: "خطأ في السيرفر: " + err.message });
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
