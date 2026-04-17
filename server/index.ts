import express, { type Request, Response, NextFunction } from "express";
import cookieSession from "cookie-session";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { storage } from "./storage";
import { createServer } from "http";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Use cookie-session for serverless compatibility
app.use(
  cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || "nfc-card-secret-key-2024"],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    secure: process.env.NODE_ENV === "production",
    sameSite: 'lax',
  })
);

// Passport requires this when using cookie-session to recreate the session object
app.use(function(req, res, next) {
    if (req.session && !req.session.regenerate) {
        req.session.regenerate = (cb: any) => { cb(null) }
    }
    if (req.session && !req.session.save) {
        req.session.save = (cb: any) => { cb(null) }
    }
    next()
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Setup function
let setupPromise: Promise<void> | null = null;

async function setupApp() {
  if (setupPromise) return setupPromise;
  
  setupPromise = (async () => {
    await storage.ensureAdminExists();
    const httpServer = createServer(app);
    await registerRoutes(httpServer, app);

    // Health check
    app.get("/api/health", (_req, res) => {
        res.json({ status: "ok", time: new Date().toISOString() });
    });

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Internal Server Error:", err);
      if (res.headersSent) return next(err);
      return res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
      serveStatic(app);
    }
    
    return httpServer;
  })();
  
  return setupPromise;
}

// For Vercel Serverless
export default async function vercelHandler(req: Request, res: Response) {
  try {
    await setupApp();
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Handler Crash:", err);
    res.status(500).json({ 
        message: "Internal Server Error", 
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
}

// For local development
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  (async () => {
    const httpServer = await setupApp();
    if (!httpServer) return; // Fix for TS potentially null

    if (process.env.NODE_ENV !== "production") {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      log(`serving on port ${port}`);
    });
  })();
}
