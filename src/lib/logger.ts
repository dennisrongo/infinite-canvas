/**
 * Secure Logging Utility
 *
 * Provides structured logging that automatically filters sensitive data
 * and provides helpful debugging information.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

// Sensitive keys that should never be logged
const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'apiSecret',
  'authToken',
  'sessionToken',
  'csrfToken',
  'resetToken',
  'cookie',
  'authorization',
  'accessToken',
  'refreshToken',
];

/**
 * Sanitizes an object by removing or masking sensitive values
 */
function sanitizeObject(obj: any, depth = 0): any {
  if (depth > 5) return '[Max depth reached]';

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack?.split('\n').slice(0, 3), // Limit stack trace depth
    };
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if this is a sensitive key
      const isSensitive = SENSITIVE_KEYS.some(sensitive =>
        lowerKey.includes(sensitive.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Format log entry with timestamp and level
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): string {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase();

  let logEntry = `[${timestamp}] ${levelUpper}: ${message}`;

  if (context && Object.keys(context).length > 0) {
    const sanitized = sanitizeObject(context);
    logEntry += ` | Context: ${JSON.stringify(sanitized)}`;
  }

  if (error) {
    const sanitizedError = sanitizeObject(error);
    logEntry += ` | Error: ${JSON.stringify(sanitizedError)}`;
  }

  return logEntry;
}

/**
 * Logger object with methods for different log levels
 */
export const logger = {
  /**
   * Log informational message
   */
  info(message: string, context?: LogContext) {
    console.log(formatLogEntry('info', message, context));
  },

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext) {
    console.warn(formatLogEntry('warn', message, context));
  },

  /**
   * Log error with optional error object
   */
  error(message: string, error?: Error, context?: LogContext) {
    console.error(formatLogEntry('error', message, context, error));
  },

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLogEntry('debug', message, context));
    }
  },

  /**
   * Log API request (for debugging API issues)
   */
  apiRequest(method: string, path: string, context?: LogContext) {
    this.debug(`API ${method} ${path}`, context);
  },

  /**
   * Log API error (includes error code and helpful info)
   */
  apiError(method: string, path: string, error: Error, statusCode?: number, context?: LogContext) {
    this.error(
      `API ${method} ${path} failed${statusCode ? ` with status ${statusCode}` : ''}`,
      error,
      context
    );
  },

  /**
   * Log database operation
   */
  dbQuery(operation: string, model: string, context?: LogContext) {
    this.debug(`DB ${operation} on ${model}`, context);
  },

  /**
   * Log database error
   */
  dbError(operation: string, model: string, error: Error, context?: LogContext) {
    this.error(`DB ${operation} on ${model} failed`, error, context);
  },
};

/**
 * Create a request logger that logs request details without sensitive data
 */
export function createRequestLogger(request: Request) {
  const url = new URL(request.url);
  const sanitizedContext = {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    // Note: headers are NOT logged as they may contain sensitive data
    // Note: body is NOT logged for the same reason
  };

  return {
    info(message: string, context?: LogContext) {
      logger.info(message, { ...sanitizedContext, ...context });
    },
    error(message: string, error?: Error, context?: LogContext) {
      logger.error(message, error, { ...sanitizedContext, ...context });
    },
  };
}

export default logger;
