export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

function writeLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  };

  const serialized = JSON.stringify(entry);

  switch (level) {
    case "debug":
      console.debug(serialized);
      break;
    case "info":
      console.info(serialized);
      break;
    case "warn":
      console.warn(serialized);
      break;
    case "error":
      console.error(serialized);
      break;
  }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    writeLog("debug", message, context);
  },
  info(message: string, context?: LogContext): void {
    writeLog("info", message, context);
  },
  warn(message: string, context?: LogContext): void {
    writeLog("warn", message, context);
  },
  error(message: string, context?: LogContext): void {
    writeLog("error", message, context);
  },
};
