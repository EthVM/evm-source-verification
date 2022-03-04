// eslint-disable-next-line max-classes-per-file
import { SolidityBuildInfo } from '../libs/solidity';
import { CompilerFsService } from './compiler-fs.service';
import { ISolidityExecutable } from '../compilers/solidity.executable.interface';
import { SolidityBinaryExecutable } from '../compilers/solidity.binary.executable';
import { SolidityWasmExecutable } from '../compilers/solidity.wasm.executable';
import { ContractLanguage } from '../libs/support';
import { ISolidityExecutableProvider } from '../interfaces/solidity-executable.provider.interface';

/**
 * Provides access to executable solidity compilers
 */
export class SolidityExecutableProvider implements ISolidityExecutableProvider {
  /**
   * Create a new SolidityWasmService
   * 
   * @param compilerFsService 
   */
  constructor(private readonly compilerFsService: CompilerFsService) {}

  /**
   * Get an executable solidity compiler from the build info
   *
   * @param build         compiler's build info
   * @returns             executable solididty compiler
   */
  async getExecutable(build: SolidityBuildInfo): Promise<ISolidityExecutable> {
    const compilerFilename = this
      .compilerFsService
      .getCompilerFilename({
        archConfig: build.archConfig,
        language: ContractLanguage.Solidity,
        longVersion: build.nameDetail.longVersion,
      });

    await this
      .compilerFsService
      .download({
        filename: compilerFilename,
        uri: build.archConfig.buildUri(build.git),
        makeExecutable: !build.archConfig.isWasm,
      })

    // return the compiler as an executable
    const executable: ISolidityExecutable = build.archConfig.isWasm
      ? new SolidityWasmExecutable(compilerFilename, build.nameDetail)
      : new SolidityBinaryExecutable(compilerFilename);

    return executable
  }
}
