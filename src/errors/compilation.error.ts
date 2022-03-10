import { CompilerOutputErr } from "../types";

export interface CompilationErrorOptions {
  output?: undefined | CompilerOutputErr;
}

/**
 * Thrown when there was an error compiling a contract
 */
export class CompilationError extends Error {
  /**
   * Errors from compilation
   */
  public readonly output?: CompilerOutputErr;

  constructor(
    message: string,
    options?: CompilationErrorOptions,
  ) {
    super(message);
    this.output = options?.output;
  }
}