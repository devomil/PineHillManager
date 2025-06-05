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
    name: 'connect.sid', // Standard session name
    cookie: {
      httpOnly: false, // Allow client-side access for debugging
      secure: false, // Allow HTTP in development
      maxAge: sessionTtl,
      sameSite: 'lax', // Allow cross-site requests in development
      path: '/', // Ensure cookie is available site-wide
    },
  });
}

export async function setupDevAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Development login route - create manager user for Sarah Johnson
  app.get("/api/login", async (req, res) => {
    try {
      // Create or get Sarah Johnson (manager) for testing
      let user = await storage.getUser("manager001");
      if (!user) {
        user = await storage.upsertUser({
          id: "manager001",
          email: "sarah@pinehillfarm.co",
          firstName: "Sarah",
          lastName: "Johnson",
          profileImageUrl: null,
        });
        // Update role to manager after creation
        await storage.updateUserRole("manager001", "manager");
        user = await storage.getUser("manager001");
      }

      // Set session with null check
      if (user) {
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
          expires_at: Math.floor(Date.now() / 1000) + 28800, // 8 hours
        };

        console.log("Setting session for user:", user.firstName, user.lastName, "Role:", user.role);

        // Save session before redirect
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ message: "Session error" });
          }
          console.log("Session saved, redirecting to dashboard");
          res.redirect("/");
        });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
      }
      res.clearCookie('pinehill.session');
      res.redirect("/");
    });
  });

  // Clear all sessions route for development
  app.get("/api/clear-sessions", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
      }
      res.clearCookie('pinehill.session');
      res.json({ message: "All sessions cleared" });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  console.log("Authentication middleware called for:", req.method, req.path);
  console.log("Session data:", req.session);
  
  const user = (req.session as any)?.user;

  if (!user) {
    console.log("No user in session - returning 401");
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.status(401).send("Unauthorized");
    }
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  console.log("User found in session:", user);

  // Auto-refresh token if it's expiring soon (within 1 hour)
  const now = Math.floor(Date.now() / 1000);
  if (user.expires_at && user.expires_at - now < 3600) {
    // Extend session by 8 hours
    user.expires_at = now + 28800;
    (req.session as any).user = user;
  }

  if (user.expires_at && user.expires_at <= now) {
    console.log("Token expired - returning 401");
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.status(401).send("Token expired");
    }
    return res.status(401).json({ message: "Token expired" });
  }

  console.log("Authentication successful, proceeding to next middleware");
  req.user = user;
  next();
};