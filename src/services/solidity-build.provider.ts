import chalk from 'chalk';
import {
  SolidityCompilerNameDetails,
  SolidityArchConfig,
  SolidityBuildInfo,
  getSolidityPlatformName,
  SolidityArchConfigNative,
  SolidityArchConfigWasm,
} from '../libs/solidity';
import { ISolidityReleaseProvider } from './solidity-release.provider';
import { CompilerNotFoundError } from '../errors/compiler-not-found.error';
import { logger } from '../logger';

const log = logger.child({});

/**
 * Provides access to executable solidity compilers
 */
export interface ISolidityBuildProvider {
  /**
   * Get a build compatible with this system
   *
   * Prioritises native builds over wasm
   *
   * @param nameDetail        name details of the compiler
   * @param wasmArchConfig    wasm architecture config
   * @param nativeArchConfig  system compatible architecture config, if compatible
   * @returns                 system compatible build
   * @throws {CompilerNotFoundError}
   */
  getCompatibleBuildInfo(
    nameDetail: SolidityCompilerNameDetails,
    wasmArchConfig: SolidityArchConfigWasm,
    nativeArchConfig: null | SolidityArchConfigNative,
  ): Promise<SolidityBuildInfo>;

  /**
   * Get wasm build info for a compiler
   *
   * @param nameDetail  compiler name details
   * @param archConfig  wasm architecture config
   * @returns           wasm build info
   */
  getWasmBuildInfo(
    nameDetail: SolidityCompilerNameDetails,
    archConfig: SolidityArchConfigWasm,
  ): Promise<null | SolidityBuildInfo>;

  /**
   * Get native build info for a compiler
   *
   * @param nameDetail    compiler name details
   * @param archConfig    config for this architecture
   * @returns             native build info if it exists
   */
  getNativeBuildInfo(
    nameDetail: SolidityCompilerNameDetails,
    archConfig: SolidityArchConfigNative,
  ): Promise<null | SolidityBuildInfo>;
}

/**
 * Provides access to executable solidity compilers
 */
export class SolidityBuildProvider implements ISolidityBuildProvider {
  /**
   * Create a new SolidityBuildProvider
   * 
   * @param solReleaseProvider 
   */
  constructor(private readonly solReleaseProvider: ISolidityReleaseProvider) {
    //
  }

  /**
   * Get a build compatible with this system
   *
   * Prioritises native builds over wasm
   *
   * @param nameDetail        name details of the compiler
   * @param wasmArchConfig    wasm architecture config
   * @param nativeArchConfig  system compatible architecture config, if compatible
   * @returns                 system compatible build
   * @throws {CompilerNotFoundError}
   */
  async getCompatibleBuildInfo(
    nameDetail: SolidityCompilerNameDetails,
    wasmArchConfig: SolidityArchConfigWasm,
    nativeArchConfig: null | SolidityArchConfigNative,
  ): Promise<SolidityBuildInfo> {
    const { longVersion } = nameDetail;

    const [
      wasmBuild,
      nativeBuild,
    ] = await Promise.all([
      this.getWasmBuildInfo(nameDetail, wasmArchConfig),
      nativeArchConfig ? this.getNativeBuildInfo(nameDetail, nativeArchConfig) : null,
    ]);

    const { major, minor, patch, } = nameDetail; 

    let build: SolidityBuildInfo | null;
    if (nativeBuild && major === 0 && minor <= 4 && patch < 11) {
      /**
       * the --standard-json option only became supported in release v0.4.11
       * [Release v0.4.11](https://github.com/ethereum/solidity/releases/tag/v0.4.11)
       */
      const msg = `solidity binary compiler ${chalk.magenta(longVersion)} does` +
        ' not support option --standard-json which was added in v0.4.11' +
        '\n  falling back to wasm compiler' +
        '\n  see https://github.com/ethereum/solidity/releases/tag/v0.4.11';
      // wasm seems to support standard json input, even at lower versions...
      log.info(msg);
      build = wasmBuild;
    } else {
      build = nativeBuild ?? wasmBuild;
    }


    if (!build) {
      // no matching build
      const msg = `build ${longVersion} not found this platform`;
      throw new CompilerNotFoundError(msg);
    }

    // notify if using a fallback build
    if (build.git.longVersion !== longVersion) {
      const msg = `no build matched exactly ${chalk.magenta(longVersion)}, switching to` +
        `  ${chalk.green('alternative')}=${chalk.magenta(build.git.longVersion)}` +
        (`  ${chalk.green('platform')}=${build.archConfig.isWasm
          ? 'wasm'
          : getSolidityPlatformName(build.archConfig.platform)}`);
      log.warn(msg);
    }

    return build;
  }

  /**
   * Get wasm build info for a compiler
   *
   * @param nameDetail  compiler name details
   * @param archConfig  wasm architecture config
   * @returns           wasm build info
   */
  public async getWasmBuildInfo(
    nameDetail: SolidityCompilerNameDetails,
    archConfig: SolidityArchConfigWasm,
  ): Promise<null | SolidityBuildInfo> {
    const target = await this.getBuildInfo(nameDetail, archConfig);
    return target;
  }

  /**
   * Get native build info for a compiler
   *
   * @param nameDetail      compiler name details
   * @param archConfig      config for this architecture
   * @returns               native build info if it exists
   */
  public async getNativeBuildInfo(
    nameDetail: SolidityCompilerNameDetails,
    archConfig: SolidityArchConfigNative,
  ): Promise<null | SolidityBuildInfo> {
    const target = await this.getBuildInfo(nameDetail, archConfig);
    return target;
  }

  /**
   * Get build info a compiler & architecture
   *
   * @param archConfig      architecture config
   * @param nameDetail      compiler name details
   * @returns               build if it exists
   */
  private async getBuildInfo(
    nameDetail: SolidityCompilerNameDetails,
    archConfig: SolidityArchConfig,
  ): Promise<null | SolidityBuildInfo> {
    const { longVersion, version, } = nameDetail;
    const releases = await this.solReleaseProvider.getReleases(archConfig);
    let build: null | SolidityBuildInfo = null;
    if (releases.buildsByLongVersion.has(longVersion)) {
      const git = releases.buildsByLongVersion.get(longVersion)!;
      build = { nameDetail, archConfig, git, };
    }
    // fallback to short version match
    else if (releases.buildsByVersion.has(version)) {
      const git = releases.buildsByVersion.get(version)!;
      build = { nameDetail, archConfig, git, };
    }
    return build;
  }

}
