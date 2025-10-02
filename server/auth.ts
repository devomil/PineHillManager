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
import { authLogger } from "./secure-logger";

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
    authLogger.error("Password comparison error", error instanceof Error ? error : new Error(String(error)));
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
      authLogger.error('PostgreSQL session store error', err);
    });
    
    authLogger.info('Using PostgreSQL session store');
  } catch (error) {
    authLogger.warn('PostgreSQL session store failed, using memory store', { error: error instanceof Error ? error.message : String(error) });
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
          authLogger.auth('Authentication attempt', { email });
          const user = await storage.getUserByEmail(email);
          authLogger.auth('User lookup result', { email, userExists: !!user });
          
          if (!user || !user.password) {
            authLogger.auth('Authentication failed: user not found or no password', { email });
            return done(null, false, { message: "Invalid email or password" });
          }

          authLogger.debug('Verifying password');
          const isValidPassword = await comparePasswords(password, user.password);
          authLogger.auth('Password verification completed', { email, valid: isValidPassword });
          
          if (!isValidPassword) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.isActive) {
            authLogger.auth('Authentication failed: inactive account', { email });
            return done(null, false, { message: "Account is deactivated" });
          }

          // Update last login
          await storage.updateUserProfile(user.id, { lastLogin: new Date() });

          authLogger.auth('Authentication successful', { email, userId: user.id });
          return done(null, user);
        } catch (error) {
          authLogger.error('Authentication error in strategy', error instanceof Error ? error : new Error(String(error)));
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    authLogger.debug('Serializing user session', { userId: user.id });
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      authLogger.debug('Deserializing user session', { userId: id });
      const user = await storage.getUser(id);
      authLogger.debug('User session deserialized successfully', { userId: id, userExists: !!user });
      done(null, user);
    } catch (error) {
      authLogger.error('User session deserialization error', error instanceof Error ? error : new Error(String(error)), { userId: id });
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
      authLogger.error('User registration error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    authLogger.auth('Login attempt initiated', { email: req.body.email });
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        authLogger.error('Authentication error during login', err);
        return res.status(500).json({ error: "Authentication error" });
      }
      if (!user) {
        authLogger.auth('Login failed', { email: req.body.email, reason: info?.message });
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          authLogger.error('Session login error', loginErr, { userId: user.id });
          return res.status(500).json({ error: "Login failed" });
        }
        authLogger.auth('Login successful', { email: req.body.email, userId: user.id });
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
        authLogger.error("Logout error", err);
        return next(err);
      }
      
      // Destroy the session completely
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          authLogger.error('Session destroy error during logout', destroyErr);
          return res.status(500).json({ error: "Logout failed" });
        }
        
        // Clear the session cookie
        res.clearCookie('pine-hill-session');
        res.clearCookie('connect.sid');
        authLogger.auth('User logged out successfully');
        res.sendStatus(200);
      });
    });
  });

  // Get current user endpoint
  app.get("/api/user", async (req, res) => {
    // Give session deserialization a moment to complete if needed
    // This prevents race conditions where the check happens before passport deserializes the session
    if (!req.user && req.session) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
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
      authLogger.info('Password reset token generated', { email });
      
      res.json({ message: "If that email exists, a reset link has been sent" });
    } catch (error) {
      authLogger.error('Password reset error', error instanceof Error ? error : new Error(String(error)));
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
      authLogger.error('Password reset completion error', error instanceof Error ? error : new Error(String(error)));
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
      authLogger.error('Password change error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: "Password change failed" });
    }
  });
}

// Authentication middleware for protected routes
function isAuthenticated(req: any, res: any, next: any) {
  try {
    authLogger.debug('Authentication middleware check', { 
      method: req.method, 
      path: req.path,
      authenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      userId: req.user?.id
    });
    
    if (req.isAuthenticated() && req.user) {
      authLogger.debug('Authentication middleware: access granted', { userId: req.user.id });
      return next();
    }
    
    authLogger.auth('Authentication middleware: access denied', { method: req.method, path: req.path });
    res.status(401).json({ error: "Authentication required" });
  } catch (error) {
    authLogger.error('Authentication middleware error', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: "Authentication error" });
  }
}

// Role-based authorization middleware
function requireRole(roles: string | string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      authLogger.security('Access denied: insufficient role', {
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles
      });
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    authLogger.debug('Access granted', {
      userId: req.user.id,
      userRole,
      requiredRoles: allowedRoles
    });
    next();
  };
}

// Admin-only middleware (includes managers)
function requireAdmin(req: any, res: any, next: any) {
  return requireRole(['admin', 'manager'])(req, res, next);
}

// Manager or Admin middleware
function requireManagerOrAdmin(req: any, res: any, next: any) {
  return requireRole(['manager', 'admin'])(req, res, next);
}

export { isAuthenticated, requireRole, requireAdmin, requireManagerOrAdmin };

export { hashPassword, comparePasswords };