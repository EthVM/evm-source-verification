import { ContractConfig, CompilerInput, CompilerOutputOk } from "../types";

/**
 * Provides general access to contract compilation
 */
export interface ICompilerService {
  /**
   * Compile a contract
   *
   * @param config    contract config
   * @param input     contract compilation input
   * @returns         compiled output
   */
  compile(
    config: ContractConfig,
    input: CompilerInput,
  ): Promise<CompilerOutputOk>;
}
