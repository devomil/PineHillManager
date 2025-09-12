/**
 * Secure logging utility that redacts sensitive information
 * Prevents password hashes, tokens, and other sensitive data from appearing in logs
 */

interface LogContext {
  [key: string]: any;
}

// List of sensitive field names to redact
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'token',
  'apiKey',
  'secret',
  'privateKey',
  'sessionId',
  'refreshToken',
  'accessToken',
  'authToken',
  'csrf',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'cvv',
  'pin'
]);

// Pattern to match potential password hashes (bcrypt, scrypt, argon2, etc.)
const HASH_PATTERNS = [
  /\$2[ayb]\$\d+\$[\w./]+/g, // bcrypt
  /\$scrypt\$[\w./+=]+/g,    // scrypt
  /\$argon2[id]?\$[\w./+=]+/g, // argon2
  /[a-fA-F0-9]{32,}/g        // potential hex hashes
];

/**
 * Recursively redacts sensitive information from objects
 */
function redactSensitiveData(obj: any, maxDepth: number = 5): any {
  if (maxDepth <= 0) return '[MAX_DEPTH_REACHED]';
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Check for hash patterns in strings
    let redactedString = obj;
    for (const pattern of HASH_PATTERNS) {
      redactedString = redactedString.replace(pattern, '[REDACTED_HASH]');
    }
    return redactedString;
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, maxDepth - 1));
  }
  
  if (typeof obj === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (SENSITIVE_FIELDS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('token')) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(value, maxDepth - 1);
      }
    }
    return redacted;
  }
  
  return obj;
}

/**
 * Format log entry with timestamp and level
 */
function formatLogEntry(level: string, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(redactSensitiveData(context))}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
}

/**
 * Secure logger that automatically redacts sensitive information
 */
export class SecureLogger {
  private context: LogContext;
  
  constructor(defaultContext: LogContext = {}) {
    this.context = defaultContext;
  }
  
  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): SecureLogger {
    return new SecureLogger({ ...this.context, ...additionalContext });
  }
  
  /**
   * Log info level messages
   */
  info(message: string, context?: LogContext): void {
    const mergedContext = { ...this.context, ...context };
    console.log(formatLogEntry('info', message, mergedContext));
  }
  
  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    const mergedContext = { ...this.context, ...context };
    console.warn(formatLogEntry('warn', message, mergedContext));
  }
  
  /**
   * Log error messages
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : {};
    const mergedContext = { ...this.context, ...context, ...errorContext };
    console.error(formatLogEntry('error', message, mergedContext));
  }
  
  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production') {
      const mergedContext = { ...this.context, ...context };
      console.debug(formatLogEntry('debug', message, mergedContext));
    }
  }
  
  /**
   * Log authentication events with automatic redaction
   */
  auth(event: string, context?: LogContext): void {
    this.info(`Auth: ${event}`, context);
  }
  
  /**
   * Log security events
   */
  security(event: string, context?: LogContext): void {
    this.warn(`Security: ${event}`, context);
  }
}

// Create default logger instance
export const logger = new SecureLogger();

// Create specialized loggers for different modules
export const authLogger = logger.child({ module: 'auth' });
export const payrollLogger = logger.child({ module: 'payroll' });
export const apiLogger = logger.child({ module: 'api' });