// Test utility functions for error logging
import fs from 'fs';
import path from 'path';

export function logError(message: string) {
  const logPath = path.resolve(process.cwd(), 'error_logs.txt');
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ERROR: ${message}\n`;
  
  try {
    fs.appendFileSync(logPath, logEntry);
  } catch (e) {
    // Fallback to console if file write fails
    console.error('Failed to write to error log:', e);
    console.error('Original error:', message);
  }
}

export function clearErrorLogs() {
  const logPath = path.resolve(process.cwd(), 'error_logs.txt');
  const header = '# Error Logs\n# Automatic error logging during tests\n# Format: Timestamp - ERROR: [description]\n';
  
  try {
    fs.writeFileSync(logPath, header);
  } catch (e) {
    console.error('Failed to clear error logs:', e);
  }
}

// Global error handler setup for tests
export function setupGlobalErrorHandler() {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      logError(`Global error: ${event.error?.message || event.message}`);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      logError(`Unhandled promise rejection: ${event.reason?.message || event.reason}`);
    });
  }
  
  // Node.js error handlers
  if (typeof process !== 'undefined') {
    process.on('uncaughtException', (error) => {
      logError(`Uncaught exception: ${error.message}`);
    });
    
    process.on('unhandledRejection', (reason) => {
      logError(`Unhandled rejection: ${reason instanceof Error ? reason.message : reason}`);
    });
  }
}