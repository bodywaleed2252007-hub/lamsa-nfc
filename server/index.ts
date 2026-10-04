// Load .env BEFORE the API module is evaluated (it validates SESSION_SECRET at import time).
import "dotenv/config";
import { createServer } from "http";
import app from "../api/index";
import { serveStatic } from "./static";

/**
 * Local / self-hosted entrypoint.
 *
 * SECURITY PARITY: all API routes, middlewares (requireAuth / requireAdmin / requireProfileOwner),
 * sanitisation, rate limiting and env checks live in api/index.ts (the Vercel handler) and are
 * mounted here as-is, so dev/local and production run the exact same code.
 * This file only adds the HTTP listener plus Vite (dev) or static files (prod).
 */
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  const httpServer = createServer(app);

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    log(`serving on port ${port}`);
  });
})();
