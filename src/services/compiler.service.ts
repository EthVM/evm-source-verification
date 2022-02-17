import { CompilerType, getCompilerType, isSupported } from "../libs/support";
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
  ): Promise<CompiledOutput>;
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

  /**
   * Compile a contract
   *
   * @param config    contract config
   * @param input     contract compilation input
   * @returns         compiled output
   */
  async compile(
    config: ContractConfig,
    input: ContractInput,
  ): Promise<CompiledOutput> {
    const { compiler, } = config;

    const type = getCompilerType(compiler);

    if (!isSupported(compiler)) {
      throw new Error(`unsupported compiler ${compiler}`);
    }
    
    // is solidity compiler
    switch (type) {
      case CompilerType.Solidity: {
        const output = await this.solidity.compile(
          compiler,
          input,
        );
        return output;
      }
      default:
        throw new Error('something went wrong');
    }
  }

}
