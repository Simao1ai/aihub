import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import { validateSession } from "./lib/session";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// Trust the first proxy hop (Replit's reverse proxy) so express-rate-limit
// can correctly identify clients via X-Forwarded-For
app.set("trust proxy", 1);

// ── CORS — restrict to our frontend and Replit dev domain ─────────────────
const ALLOWED_ORIGINS: (string | RegExp)[] = [
  /^https?:\/\/localhost(:\d+)?$/,
  /\.replit\.dev$/,
  /\.replit\.app$/,
  /\.repl\.co$/,
  /synthdesk\.ai$/,
];
if (process.env.REPLIT_DEV_DOMAIN) {
  ALLOWED_ORIGINS.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (same-origin, Postman, curl)
      if (!origin) return callback(null, true);
      const allowed = ALLOWED_ORIGINS.some(o =>
        typeof o === "string" ? o === origin : o.test(origin)
      );
      callback(allowed ? null : new Error("Not allowed by CORS"), allowed);
    },
    credentials: true,
  })
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Auth middleware — applied to all /api/* except /api/auth/* & /api/health ──
// OAuth callbacks are browser redirects from third-party providers — no Bearer header
// is possible on these requests. Workspace identity is recovered from the signed state param.
const PUBLIC_PREFIXES = ["/api/auth/", "/api/health", "/api/connections/oauth/"];

app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
  const fullPath = "/api" + req.path;

  // Allow public endpoints
  if (PUBLIC_PREFIXES.some(p => fullPath.startsWith(p))) return next();
  if (req.path === "/health") return next();

  // Also allow GET /api/generated-images/* (served as static before this hits)
  if (req.path.startsWith("/generated-images/")) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.slice(7);
  const workspace = await validateSession(token);
  if (!workspace) {
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }

  // Attach workspace to request for downstream use
  (req as any).sessionWorkspace = workspace;
  next();
});

// Serve AI-generated images under /api/generated-images (proxy routes /api to this server)
app.use("/api/generated-images", express.static(path.join(__dirname, "../generated-images")));

app.use("/api", router);

export default app;
