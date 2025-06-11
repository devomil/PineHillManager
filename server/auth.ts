import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  let sessionStore;

  // Try PostgreSQL session store first, fallback to memory store
  try {
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
      errorLog: console.error,
    });
    
    sessionStore.on('error', (err) => {
      console.error('PostgreSQL session store error:', err);
    });
    
    console.log("Using PostgreSQL session store");
  } catch (error) {
    console.warn("PostgreSQL session store failed, using memory store:", error.message);
    const MemStore = MemoryStore(session);
    sessionStore = new MemStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  return session({
    secret: process.env.SESSION_SECRET || "pine-hill-farm-secret-key-very-long-and-secure",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: {
      httpOnly: true,
      secure: false, // Allow non-HTTPS for development
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
    name: 'pine-hill-session',
  });
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          console.log("Authenticating user with email:", email);
          const user = await storage.getUserByEmail(email);
          console.log("User found:", user ? "Yes" : "No");
          
          if (!user || !user.password) {
            console.log("User not found or no password");
            return done(null, false, { message: "Invalid email or password" });
          }

          console.log("Comparing passwords...");
          const isValidPassword = await comparePasswords(password, user.password);
          console.log("Password valid:", isValidPassword);
          
          if (!isValidPassword) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.isActive) {
            console.log("User account is inactive");
            return done(null, false, { message: "Account is deactivated" });
          }

          // Update last login
          await storage.updateUserProfile(user.id, { lastLogin: new Date() });

          console.log("Authentication successful for user:", user.email);
          return done(null, user);
        } catch (error) {
          console.error("Authentication error in strategy:", error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log('Deserializing user ID:', id);
      const user = await storage.getUser(id);
      console.log('Deserialized user:', user);
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, employeeId } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "All fields are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        employeeId,
        role: "employee",
        isActive: true,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt for email:", req.body.email);
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ error: "Authentication error" });
      }
      if (!user) {
        console.log("Login failed:", info?.message);
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session login error:", loginErr);
          return res.status(500).json({ error: "Login failed" });
        }
        console.log("Login successful for user:", user.email);
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      
      // Destroy the session completely
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
          return res.status(500).json({ error: "Logout failed" });
        }
        
        // Clear the session cookie
        res.clearCookie('pine-hill-session');
        res.clearCookie('connect.sid');
        console.log("User logged out successfully");
        res.sendStatus(200);
      });
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.sendStatus(401);
    }
    res.json({
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
    });
  });

  // Password reset request
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If that email exists, a reset link has been sent" });
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString("hex");
      await storage.createPasswordResetToken(user.id, resetToken);

      // In production, send email here
      console.log(`Password reset token for ${email}: ${resetToken}`);
      
      res.json({ message: "If that email exists, a reset link has been sent" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // Password reset
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      const userId = await storage.validatePasswordResetToken(token);
      if (!userId) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserProfile(userId, { password: hashedPassword });
      await storage.deletePasswordResetToken(token);

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // Change password for logged-in users
  app.post("/api/change-password", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.sendStatus(401);
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new passwords are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters long" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.password) {
        return res.status(400).json({ error: "User not found" });
      }

      const isValidPassword = await comparePasswords(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserProfile(user.id, { password: hashedPassword });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Password change failed" });
    }
  });
}

// Authentication middleware for protected routes
function isAuthenticated(req: any, res: any, next: any) {
  console.log('Auth check - isAuthenticated():', req.isAuthenticated());
  console.log('Auth check - session user:', req.user);
  console.log('Auth check - session:', req.session);
  
  if (req.isAuthenticated() && req.user) {
    console.log('Authentication successful for user:', req.user.id);
    return next();
  }
  
  console.log('Authentication failed, returning 401');
  res.status(401).json({ error: "Authentication required" });
}

export { isAuthenticated };

export { hashPassword, comparePasswords };