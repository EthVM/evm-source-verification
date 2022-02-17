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

// eslint-disable-next-line no-shadow
export enum CompilerType {
  Solidity,
  Vyper,
  Unknown,
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

    const type = this.getCompilerType(compiler);

    if (!this.isSupported(compiler)) {
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

  /**
   * Is this compiler supported?
   *
   * @param compilername    name of the compiler
   * @returns               whether this compiler is supported
   */
  private isSupported(compilername: string): boolean {
    const type = this.getCompilerType(compilername);
    if (type === CompilerType.Solidity) return true;
    return false;
  }

  /**
   * Get the type of the compiler
   *
   * @param compilername    name of the compiler
   * @returns               type of the compiler
   */
  // eslint-disable-next-line class-methods-use-this
  private getCompilerType(compilername: string): CompilerType {
    // TODO: improve this
    const type = compilername.includes('vyper')
      ? CompilerType.Vyper
      : CompilerType.Solidity;
    return type;
  }

}
