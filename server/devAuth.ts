import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Development authentication bypass
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Allow HTTP in development
      maxAge: sessionTtl,
    },
  });
}

export async function setupDevAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Development login route
  app.get("/api/login", async (req, res) => {
    // Create or get a test user
    let user = await storage.getUser("40154188");
    if (!user) {
      user = await storage.upsertUser({
        id: "40154188",
        email: "ryan@pinehillfarm.co",
        firstName: "Ryan",
        lastName: "Sorensen",
        profileImageUrl: null,
      });
    }

    // Set session
    (req.session as any).user = {
      claims: {
        sub: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        profile_image_url: user.profileImageUrl,
      },
      access_token: "dev-token",
      refresh_token: "dev-refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: "Session error" });
      }
      res.redirect("/");
    });
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = (req.session as any)?.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Add user to request
  (req as any).user = user;
  return next();
};