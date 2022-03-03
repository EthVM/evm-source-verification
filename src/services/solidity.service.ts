import {
  CompilerInput,
  CompilerOutputErr,
  CompilerOutputOk,
} from "../types";
import { CompilationError } from '../errors/compilation.error';
import {
  parseSolidityCompilerName,
  isSolidityOutputOk,
  SolidityCompilerName,
} from '../libs/solidity';
import { ILanguageService } from "../interfaces/language.service.interface";
import { ISolidityBuildProvider } from "./solidity-build.provider";
import { ISolidityArchProvider } from "./solidity-arch.provider";
import { ISolidityExecutableProvider } from "../interfaces/solidity-executable.provider.interface";

/**
 * Provides access to Compilers with Solidity
 */
export class SolidityService implements ILanguageService {
  /**
   * Create a new SolidityCompilerService
   * 
   * @param solArchProvider   provides the system compatible solidity arch
   * @param solBuildProvider  provides solidity builds
   * @param solExecProvider   provides solidity executables
   */
  constructor(
    private readonly solArchProvider: ISolidityArchProvider,
    private readonly solBuildProvider: ISolidityBuildProvider,
    private readonly solExecProvider: ISolidityExecutableProvider,
  ) {
    //
  }

  /**
   * Compile a contract with solidity
   *
   * @param compilerName         compiler name to use
   * @param input               input for the compiler
   * @returns                   compiled output
   * @throws {CompilerNotFoundError}
   */
  async compile(
    compilerName: SolidityCompilerName,
    input: CompilerInput,
  ): Promise<CompilerOutputOk> {

    const nameDetail = parseSolidityCompilerName(compilerName);
    const wasmArch = this.solArchProvider.getWasmArch();
    const nativeArch = this.solArchProvider.getNativeArch();
    const build = await this.solBuildProvider.getCompatibleBuildInfo(
      nameDetail,
      wasmArch,
      nativeArch,
    );
    const executable = await this.solExecProvider.getExecutable(build);
    const output = await executable.compile(input);

    if (!isSolidityOutputOk(output)) {
      const msg = `solidity compilation produced an error`;
      throw new CompilationError(msg, { output: output as CompilerOutputErr });
    }

    return output;
  }
}
