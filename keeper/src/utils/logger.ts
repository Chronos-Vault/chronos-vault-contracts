/**
 * Simple logger utility
 * Production: Replace with Winston or Pino
 */
// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:28:16.010Z


export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },

  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  },

  debug: (message: string, ...args: any[]) => {
    if (process.env.DEBUG === "true") {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
};
