export type LogContext = Record<string, unknown> | undefined;

export interface LogOpts {
  operation?: string;
  context?: LogContext;
  error?: unknown;
}

function buildPayload(
  level: string,
  moduleName: string,
  message: string,
  opts?: LogOpts
) {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    module: moduleName,
    operation: opts?.operation,
    message,
    context: opts?.context,
  };

  if (opts?.error) {
    payload.error = opts.error;
    // if (opts.error instanceof Error) {
    //   payload.error = { message: opts.error.message, stack: opts.error.stack };
    // } else {
    //   payload.error = opts.error;
    // }
  }

  return payload;
}

function safeStringify(obj: unknown) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export const logger = {
  info(moduleName: string, message: string, opts?: LogOpts) {
    const p = buildPayload("info", moduleName, message, opts);
    // Info logs to stdout
    try {
      console.log(JSON.stringify(p, null, 2));
    } catch {
      console.log(`[${moduleName}] ${message}`);
      if (opts?.context) console.log("Context:", opts.context);
    }
  },

  warn(moduleName: string, message: string, opts?: LogOpts) {
    const p = buildPayload("warn", moduleName, message, opts);
    try {
      console.warn(JSON.stringify(p, null, 2));
    } catch {
      console.warn(`[${moduleName}] ${message}`);
      if (opts?.context) console.warn("Context:", opts.context);
    }
  },

  error(moduleName: string, message: string, opts?: LogOpts) {
    const p = buildPayload("error", moduleName, message, opts);
    try {
      // Print JSON payload without the error.stack (so JSON stays readable)
      console.error(JSON.stringify(p, null, 2));
    } catch {
      console.error(`[${moduleName}] ${message}`);
      if (opts?.context) console.error("Context:", opts.context);
      if (opts?.error) console.error("Error:", safeStringify(opts.error));
    }
  },

  debug(moduleName: string, message: string, opts?: LogOpts) {
    const p = buildPayload("debug", moduleName, message, opts);
    try {
      // debug to stdout; in production, debug might be filtered
      console.debug
        ? console.debug(JSON.stringify(p, null, 2))
        : console.log(JSON.stringify(p, null, 2));
    } catch {
      console.log(`[${moduleName}] ${message}`);
      if (opts?.context) console.log("Context:", opts.context);
    }
  },
};

export default logger;
