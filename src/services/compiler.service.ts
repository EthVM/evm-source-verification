import { ILanguageService } from "../interfaces/language.service.interface";
import { CompilerNotSupportedError } from "../errors/compiler-not-supported.error";
import { ContractConfig, CompilerInput, CompilerOutputOk } from "../types";
import { ICompilerService } from "../interfaces/compiler.service.interface";
import { getLanguage, ContractLanguage, isLanguageSupported, getLanguageName } from "../libs/support";
import { getCompilerName } from "../libs/solidity";

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
    const compilerName = getCompilerName(config);

    // TODO: use `input` to get the language instead ?
    const language = getLanguage(compilerName);

    if (language == null) {
      const msg = `unknown compiler: ${compilerName}`;
      throw new CompilerNotSupportedError(msg);
    }

    if (!isLanguageSupported(language)) {
      const msg = `unsupported language: ${getLanguageName(language)}`;
      throw new CompilerNotSupportedError(msg);
    }

    // is solidity compiler
    switch (language) {
      case ContractLanguage.Solidity: {
        const output = await this.solService.compile(
          compilerName,
          input,
        );
        return output;
      }
      default:
        throw new Error('something went wrong');
    }
  }

}
