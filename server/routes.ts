import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Auth: login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    const valid = await storage.validatePassword(user, password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    req.session.userId = user.id;
    return res.json({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    });
  });

  // Auth: logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session = null;
    res.json({ message: "Logged out" });
  });

  // Auth: get current user
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isActive) {
      req.session = null;
      return res.status(401).json({ message: "Not authenticated" });
    }
    return res.json({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    });
  });

  // Admin: list users
  app.get("/api/users", requireAdmin, async (_req: Request, res: Response) => {
    const all = await storage.listUsers();
    return res.json(all.map(u => ({
      id: u.id,
      username: u.username,
      isAdmin: u.isAdmin,
      isActive: u.isActive,
    })));
  });

  // Admin: create user
  app.post("/api/users", requireAdmin, async (req: Request, res: Response) => {
    const parsed = insertUserSchema.safeParse({
      username: req.body.username,
      password: req.body.password,
      isAdmin: req.body.isAdmin ?? false,
      isActive: req.body.isActive ?? true,
    });
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid user data" });
    }

    const existing = await storage.getUserByUsername(parsed.data.username);
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const user = await storage.createUser(parsed.data);
    return res.status(201).json({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    });
  });

  // Admin: update user (toggle active/admin, change password)
  app.patch("/api/users/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    if (typeof req.body.isActive === "boolean") updates.isActive = req.body.isActive;
    if (typeof req.body.isAdmin === "boolean") updates.isAdmin = req.body.isAdmin;
    if (req.body.password) updates.password = req.body.password;

    const user = await storage.updateUser(id, updates as any);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    });
  });

  // Admin: delete user
  app.delete("/api/users/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    await storage.deleteUser(id);
    return res.json({ message: "User deleted" });
  });

  return httpServer;
}
