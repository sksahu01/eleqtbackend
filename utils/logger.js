import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { format } from "date-fns";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logger configuration
const LOG_DIR = path.join(__dirname, "../logs");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5; // Keep up to 5 rotated logs

// Console loggers
const info = (...params) => {
  if (process.env.NODE_ENV !== "test") {
    console.log(`[INFO] ${new Date().toISOString()} -`, ...params);
  }
};

const error = (...params) => {
  if (process.env.NODE_ENV !== "test") {
    console.error(`[ERROR] ${new Date().toISOString()} -`, ...params);
  }
};

// Initialize logger with rotation
const initializeLogger = async () => {
  try {
    // Create log directory if not exists
    await fs.mkdir(LOG_DIR, { recursive: true });
    info("Logger initialized successfully");
  } catch (err) {
    error("Logger initialization failed:", err.message);
  }
};

// Rotate logs when they get too large
const rotateLogs = async (filePath) => {
  try {
    const stats = await fs.stat(filePath).catch(() => ({ size: 0 }));

    if (stats.size > MAX_LOG_SIZE) {
      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const rotatedPath = path.join(LOG_DIR, `audit_${timestamp}.log`);

      // Rotate current log
      await fs.rename(filePath, rotatedPath);
      info(`Rotated log file to ${rotatedPath}`);

      // Clean up old logs
      const files = await fs.readdir(LOG_DIR);
      const logFiles = files
        .filter((f) => f.startsWith("audit_") && f.endsWith(".log"))
        .sort()
        .reverse();

      if (logFiles.length > MAX_LOG_FILES) {
        const toDelete = logFiles.slice(MAX_LOG_FILES);
        await Promise.all(
          toDelete.map((f) => fs.unlink(path.join(LOG_DIR, f)))
        );
        info(`Cleaned up ${toDelete.length} old log files`);
      }
    }
  } catch (err) {
    error("Log rotation failed:", err.message);
  }
};

// Audit logging with rotation and compression
const logAudit = async (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return;

  try {
    const filePath = path.join(LOG_DIR, "audit.log");

    // Check if rotation is needed
    await rotateLogs(filePath);

    // Prepare log data
    const timestamp = new Date().toISOString();
    const logData =
      entries
        .map((entry) =>
          JSON.stringify({
            timestamp,
            ...entry,
          })
        )
        .join("\n") + "\n";

    // Write to file
    await fs.appendFile(filePath, logData);
  } catch (err) {
    error("Audit log write failed:", err.message);

    // Create emergency log file
    const emergencyPath = path.join(
      LOG_DIR,
      `audit_emergency_${Date.now()}.log`
    );
    await fs.writeFile(
      emergencyPath,
      JSON.stringify({
        error: "Primary audit log failure",
        timestamp: new Date().toISOString(),
        originalError: err.message,
        entries,
      })
    );

    // Fallback to console
    console.error(`[AUDIT-EMERGENCY] Logs saved to ${emergencyPath}`);
  }
};

export const logger = {
  info,
  error,
  initializeLogger,
  logAudit,
};
