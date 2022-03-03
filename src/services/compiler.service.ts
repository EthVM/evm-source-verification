import { ILanguageService } from "../interfaces/language.service.interface";
import { CompilerNotSupportedError } from "../errors/compiler-not-supported.error";
import { ContractLanguage, getLanguage, isSupported } from "../libs/support";
import { ContractConfig, CompilerInput, CompilerOutputOk } from "../types";
import { ICompilerService } from "../interfaces/compiler.service.interface";

/**
 * Provides access to contract compilation
 */
export class CompilerService implements ICompilerService {
  /**
   * Create a new CompilerService
   *
   * @param solService    provides access to compilation with solidity
   */
  constructor(private readonly solService: ILanguageService) {}

  /**
   * Compile a contract
   *
   * @param config    contract config
   * @param input     contract compilation input
   * @returns         compiled output
   */
  async compile(
    config: ContractConfig,
    input: CompilerInput,
  ): Promise<CompilerOutputOk> {
    const { compiler, } = config;

    // TODO: use `input` to get the language instead ?
    const type = getLanguage(compiler);

    if (!isSupported(compiler)) {
      const msg = `unsupported compiler: ${compiler}`;
      throw new CompilerNotSupportedError(msg);
    }
    
    // is solidity compiler
    switch (type) {
      case ContractLanguage.Solidity: {
        const output = await this.solService.compile(
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
