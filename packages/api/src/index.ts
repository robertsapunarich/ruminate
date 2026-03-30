import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authMiddleware } from "./middleware/auth";
import authRoutes from "./routes/auth";
import feedRoutes from "./routes/feeds";
import entryRoutes from "./routes/entries";
import bookmarkRoutes from "./routes/bookmarks";
import tagRoutes from "./routes/tags";
import searchRoutes from "./routes/search";
import type { AppContext } from "./lib/types";

const app = new Hono<AppContext>();

// --- Middleware ---
app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: "*", // Tighten in production
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type"],
  }),
);

// Auth middleware for all API and auth routes
app.use("/api/*", authMiddleware);
app.use("/auth/*", authMiddleware);

// --- Routes ---
app.route("/auth", authRoutes);
app.route("/api/feeds", feedRoutes);
app.route("/api/entries", entryRoutes);
app.route("/api/bookmarks", bookmarkRoutes);
app.route("/api/tags", tagRoutes);
app.route("/api/search", searchRoutes);

// --- Health check ---
app.get("/api/health", (c) => {
  return c.json({ status: "ok", name: "ruminate" });
});

export default app;
