import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { publicAppUrl } from "./lib/publicAppUrl";

const app: Express = express();
app.set("trust proxy", 1);

const configuredAppUrl = publicAppUrl();
const allowedOrigins = new Set([
  "https://rllora.online",
  "https://english-speaking-practice-1--kpforce.replit.app",
  configuredAppUrl,
]);

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.has(origin)) return true;
  if (process.env.NODE_ENV === "production") return false;

  // Local development servers and Replit development previews are only
  // accepted outside production. Ports are intentionally unrestricted for
  // local tooling, but the hostname and scheme remain constrained.
  try {
    const url = new URL(origin);
    if (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      return true;
    }
    return url.protocol === "https:" &&
      (url.hostname.endsWith(".replit.dev") || url.hostname.endsWith(".repl.co"));
  } catch {
    return false;
  }
}

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
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    // Non-browser requests (webhooks, CLI clients, health checks) do not
    // send Origin and must continue to work.
    if (!origin) return callback(null, false);
    callback(null, isAllowedOrigin(origin));
  },
}));
app.use(express.json({
  limit: "60mb",
  verify: (req, _res, buffer) => {
    if ((req as typeof req & { originalUrl?: string }).originalUrl?.startsWith("/api/webhooks/")) {
      (req as typeof req & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
    }
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
