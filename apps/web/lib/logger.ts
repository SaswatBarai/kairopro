// apps/web/lib/logger.ts

export const logger = {
  info: (msg: string, ...args: any[]) => {
    process.stdout.write(`[INFO] ${new Date().toISOString()} - ${msg} ${args.length ? JSON.stringify(args) : ''}\n`);
  },
  warn: (msg: string, ...args: any[]) => {
    process.stdout.write(`[WARN] ${new Date().toISOString()} - ${msg} ${args.length ? JSON.stringify(args) : ''}\n`);
  },
  error: (msg: string, ...args: any[]) => {
    process.stderr.write(`[ERROR] ${new Date().toISOString()} - ${msg} ${args.length ? JSON.stringify(args) : ''}\n`);
  },
  debug: (msg: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      process.stdout.write(`[DEBUG] ${new Date().toISOString()} - ${msg} ${args.length ? JSON.stringify(args) : ''}\n`);
    }
  },
};
