export type ErrorContext = Record<string, unknown> | undefined;

export interface CustomErrorOpts {
  operation?: string;
  context?: ErrorContext;
}

export class CustomError extends Error {
  public readonly module: string;
  public readonly operation?: string;
  public readonly context?: ErrorContext;

  constructor(moduleName: string, message: string, opts?: CustomErrorOpts) {
    super(message);
    this.name = "CustomError";
    this.module = moduleName;
    this.operation = opts?.operation;
    this.context = opts?.context;
    // V8 stack trace capture (node)
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      module: this.module,
      operation: this.operation,
      context: this.context,
      stack: this.stack,
    } as const;
  }

  toLogString() {
    const op = this.operation ? `:${this.operation}` : "";
    const ctx = this.context ? ` Context: ${JSON.stringify(this.context)}` : "";
    return `[${this.module}${op}] ${this.message}${ctx}`;
  }
}

export function isCustomError(err: unknown): err is CustomError {
  // Prefer instanceof when possible (works when the same class reference is available).
  if (err instanceof CustomError) return true;

  // Fallback to a structural check for cases where the error may have been
  // deserialized across process boundaries or created in a different realm.
  return (
    !!err &&
    typeof err === "object" &&
    typeof (err as any).module === "string" &&
    typeof (err as any).message === "string"
  );
}
