/**
 * Secure authorization middleware specifically for payroll operations
 * Implements proper RBAC and tenant scoping for sensitive payroll data
 */

import { payrollLogger } from './secure-logger';
import { validatePayrollAccess } from './payroll-validation';

// Proper authentication check that returns 401 for unauthenticated users
export function requireAuthentication(req: any, res: any, next: any) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      payrollLogger.security('Unauthorized payroll access attempt', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    next();
  } catch (error) {
    payrollLogger.error('Authentication middleware error', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Authentication error' });
  }
}

// Enhanced authorization for payroll operations
export function requirePayrollAccess(requiredRoles: string[] = ['admin', 'manager']) {
  return (req: any, res: any, next: any) => {
    try {
      // First ensure user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        payrollLogger.security('Unauthenticated payroll access attempt', {
          method: req.method,
          path: req.path,
          ip: req.ip,
          requiredRoles
        });
        return res.status(401).json({ error: 'Authentication required for payroll operations' });
      }

      const userRole = req.user.role;
      const userId = req.user.id;

      // Check if user has required role
      if (!requiredRoles.includes(userRole)) {
        payrollLogger.security('Insufficient role for payroll access', {
          userId,
          userRole,
          requiredRoles,
          method: req.method,
          path: req.path
        });
        return res.status(403).json({ 
          error: 'Insufficient permissions for payroll operations',
          required: requiredRoles
        });
      }

      // Log successful authorization
      payrollLogger.info('Payroll access authorized', {
        userId,
        userRole,
        method: req.method,
        path: req.path
      });

      next();
    } catch (error) {
      payrollLogger.error('Payroll authorization error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Authorization error' });
    }
  };
}

// Enhanced authorization for employee-specific payroll data
export function requireEmployeePayrollAccess(req: any, res: any, next: any) {
  try {
    // First ensure user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      payrollLogger.security('Unauthenticated employee payroll access attempt', {
        method: req.method,
        path: req.path,
        targetUserId: req.params.userId,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Authentication required' });
    }

    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    const targetUserId = req.params.userId;

    const accessCheck = validatePayrollAccess(currentUserRole, currentUserId, targetUserId);

    if (!accessCheck.isAuthorized) {
      payrollLogger.security('Unauthorized employee payroll access attempt', {
        currentUserId,
        currentUserRole,
        targetUserId,
        reason: accessCheck.reason,
        method: req.method,
        path: req.path
      });
      
      return res.status(403).json({ 
        error: accessCheck.reason || 'Access denied to employee payroll data' 
      });
    }

    // Log successful access
    payrollLogger.info('Employee payroll access authorized', {
      currentUserId,
      currentUserRole,
      targetUserId,
      method: req.method,
      path: req.path
    });

    next();
  } catch (error) {
    payrollLogger.error('Employee payroll authorization error', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Authorization error' });
  }
}

// Rate limiting for sensitive payroll operations
const payrollOperationCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitPayrollOperations(maxOperations = 10, windowMs = 60000) {
  return (req: any, res: any, next: any) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userId = req.user.id;
      const now = Date.now();
      const userKey = `${userId}:${req.method}:${req.path}`;
      
      const currentData = payrollOperationCounts.get(userKey);
      
      if (!currentData || now > currentData.resetTime) {
        // Reset or initialize counter
        payrollOperationCounts.set(userKey, {
          count: 1,
          resetTime: now + windowMs
        });
        next();
      } else if (currentData.count < maxOperations) {
        // Increment counter
        currentData.count++;
        next();
      } else {
        // Rate limit exceeded
        payrollLogger.security('Payroll operation rate limit exceeded', {
          userId,
          method: req.method,
          path: req.path,
          count: currentData.count,
          maxOperations
        });
        
        res.status(429).json({ 
          error: 'Rate limit exceeded for payroll operations',
          retryAfter: Math.ceil((currentData.resetTime - now) / 1000)
        });
      }
    } catch (error) {
      payrollLogger.error('Rate limiting error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Rate limiting error' });
    }
  };
}

// Validation for payroll period access
export function validatePayrollPeriodAccess(req: any, res: any, next: any) {
  try {
    const periodId = req.params.id;
    
    if (!periodId || isNaN(parseInt(periodId))) {
      payrollLogger.warn('Invalid payroll period ID', {
        periodId,
        userId: req.user?.id,
        method: req.method,
        path: req.path
      });
      return res.status(400).json({ error: 'Invalid payroll period ID' });
    }

    req.periodId = parseInt(periodId);
    next();
  } catch (error) {
    payrollLogger.error('Payroll period validation error', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Period validation error' });
  }
}

// Validation for payroll entry access
export function validatePayrollEntryAccess(req: any, res: any, next: any) {
  try {
    const entryId = req.params.id;
    
    if (!entryId || isNaN(parseInt(entryId))) {
      payrollLogger.warn('Invalid payroll entry ID', {
        entryId,
        userId: req.user?.id,
        method: req.method,
        path: req.path
      });
      return res.status(400).json({ error: 'Invalid payroll entry ID' });
    }

    req.entryId = parseInt(entryId);
    next();
  } catch (error) {
    payrollLogger.error('Payroll entry validation error', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Entry validation error' });
  }
}