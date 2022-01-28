import { Result } from "@nkp/result";
import { CompiledOutput, ContractConfig, ContractInput, ICompiler } from "../types";

/**
 * Provides general access to Web3 compilers
 *
 * Decide which language compiler to use from the config
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
    input: ContractInput,
  ): Promise<Result<CompiledOutput, Error>>;
}

/**
 * Provides general access to Web3 compilers
 */
export class CompilerService implements ICompilerService {
  private readonly solidity: ICompiler;


  /**
   * @param solidity    provides access to compilation with solidity
   */
  constructor(solidity: ICompiler) {
    this.solidity = solidity;
  }


  /** {@link ICompilerService.compile} */
  async compile(
    config: ContractConfig,
    input: ContractInput,
  ): Promise<Result<CompiledOutput, Error>> {
    const { compiler, } = config;

    // TODO: other types
    // TODO: better validation
    const type = compiler.includes('vyper') ? 'vyper' : 'solidity';

    // is solidity compiler
    switch (type) {
      case 'solidity': {
        const output = await this.solidity.compile(
          compiler,
          input,
        );
        return Result.success(output);
      }
      default:
        return Result.fail(new Error(`unsupported compiler: ${type}`));
    }
  }
}
