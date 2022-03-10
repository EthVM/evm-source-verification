import { getSolditiyPlatform, SolidityArchConfigNative, SolidityArchConfigWasm, SolidityPlatform, SOLIDITY_PLATFORM_ARCHS, SOLIDITY_WASM_ARCH } from "../libs/solidity";

/**
 * Provides the configuration of remote solidity binaries compatible with this machine
 */
export interface ISolidityArchProvider {
  /**
   * Get the wasm architecture config
   *
   * @returns  wasm architecture config
   */
  getWasmArch(): SolidityArchConfigWasm;

  /**
   * Get the architecture config compatible with this machine
   *
   * @returns   architecture config compatible with this machine
   */
  getNativeArch(): null | SolidityArchConfigNative;

  /**
   * Get the architecture compatible with the given platform
   *
   * @param     platform  get architecture for this platform
   * @returns             architecture compatible with the given platform
   */
  getPlatformArch(platform: SolidityPlatform): SolidityArchConfigNative;
}


/**
 * Provides the configuration of remote solidity binaries compatible with this machine
 */
export class SolidityArchProvider implements ISolidityArchProvider {
  private readonly platform: null | SolidityPlatform;

  /**
   * Create a new SolidityPlatformProvider
   */
  constructor() {
    this.platform = getSolditiyPlatform();
  }

  /**
   * Get the wasm architecture config
   *
   * @returns  wasm architecture config
   */
  // eslint-disable-next-line class-methods-use-this
  getWasmArch(): SolidityArchConfigWasm {
    return SOLIDITY_WASM_ARCH;
  }

  /**
   * Get the architecture config compatible with this machine
   *
   * @returns   architecture config compatible with this machine
   */
  getNativeArch(): null | SolidityArchConfigNative {
    if (this.platform == null) return null;
    return this.getPlatformArch(this.platform);
  }

  /**
   * Get the architecture compatible with this machine
   *
   * @param     platform  get architecture for this platform
   * @returns             architecture compatible with this machine if it exists
   */
  // eslint-disable-next-line class-methods-use-this
  getPlatformArch(platform: SolidityPlatform): SolidityArchConfigNative {
    return SOLIDITY_PLATFORM_ARCHS[platform];
  }
}