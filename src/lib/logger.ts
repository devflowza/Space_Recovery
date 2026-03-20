const isDev = import.meta.env.DEV;

export const logger = {
  error: (msg: string, ...args: unknown[]) => {
    if (isDev) console.error(msg, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (isDev) console.warn(msg, ...args);
  },
  info: (msg: string, ...args: unknown[]) => {
    if (isDev) console.log(msg, ...args);
  },
};
