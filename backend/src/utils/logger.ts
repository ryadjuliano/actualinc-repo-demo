// Minimal structured logger. Kept dependency-free since this app's logging
// needs are simple (request lifecycle + AI/storage errors) — pulling in a
// framework like pino/winston here would be premature for this scope.
type LogMeta = Record<string, unknown>;

const timestamp = () => new Date().toISOString();

const format = (level: string, message: string, meta?: LogMeta) =>
  JSON.stringify({ timestamp: timestamp(), level, message, ...meta });

export const logger = {
  info: (message: string, meta?: LogMeta) => console.log(format('info', message, meta)),
  warn: (message: string, meta?: LogMeta) => console.warn(format('warn', message, meta)),
  error: (message: string, meta?: LogMeta) => console.error(format('error', message, meta)),
};
