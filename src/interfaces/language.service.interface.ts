import { CompilerInput, CompilerOutputOk } from "../types";

/**
 * Contact compiler
 */
export interface ILanguageService {
  /**
   * Compile a contract
   *
   * @param compilername        compiler name to use
   * @param input               input for the compiler
   */
  compile(
    compilername: string,
    input: CompilerInput,
  ): Promise<CompilerOutputOk>;
}