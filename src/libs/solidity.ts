/// <reference types="emscripten" />

import assert from 'node:assert';
import os from 'node:os';
import solc from 'solc';
import { logger } from '../logger';
import { CompilerInput, CompilerOutput, CompilerOutputOk, ContractConfig } from "../types";
import { fabs, hasOwn } from "./utils";

/**
 * static solidity utilities & types
 */

/**
 * @example
 * "0.8.12"
 */
export type SolidityBuildVersion = string;

/**
 * @example
 * "0.8.12+commit.f00d7308"
 */
export type SolidityLongBuildVersion = string;

/**
 * Build info of a compiler instance from lists at https://binaries.soliditylang.org
 *
 * @example
 * ```json
 * {
 *  "path": "soljson-v0.5.9-nightly.2019.5.28+commit.01b6b680.js",
 *  "version": "0.5.9",
 *  "prerelease": "nightly.2019.5.28",
 *  "build": "commit.01b6b680",
 *  "longVersion": "0.5.9-nightly.2019.5.28+commit.01b6b680",
 *  "keccak256": "0xa62ae5cea9e7660f8ad9164b161b258dccbf905ebe54484770e92aea17b53b4c",
 *  "sha256": "0xa1ff266e5f8c61379a1fb1231d0e4aceb4da05de39a13b183b9ef0fe31f64fb2",
 *  "urls": [
 *    "bzzr://bb46a6c30dc67e139197f88052e7b7e41a066996475bce40808649a15c22f7d6",
 *    "dweb:/ipfs/QmbbyBKjwD4Tt1MNTYftix8isQUL1jhXDza233gUVuEh71"
 *  ]
 * }
 * ```
 */
export interface SoliditiyGitBuildInfo {
  path: string;
  version: string;
  prerelease: string;
  build: string;
  longVersion: string;
  keccak256: string;
  sha256: string;
  urls: string[]
}

/**
 * @example
 * "v0.8.6+commit.11564f7e"
 * "v0.8.11+commit.d7f03943"
 * "v0.7.6+commit.7338295f"
 */
export type SolidityCompilerName = string;

/**
 * Details parsed from a solidity compiler name
 */
export interface SolidityCompilerNameDetails {
  compilerName: SolidityCompilerName;
  longVersion: SolidityLongBuildVersion;
  version: SolidityBuildVersion;
  commit: string;
  major: number;
  minor: number;
  patch: number;
}

/**
 * Solidity build list for a given platform from Solidities GitHub binaries
 * repository
 */
export interface SolidityPlatformReleasesRaw {
  latestRelease: string;
  releases: string[];
  builds: SoliditiyGitBuildInfo[];
}

/**
 * Solidity Platform Build List with enhanced readability
 */
export interface SolidityPlatformReleases extends SolidityPlatformReleasesRaw {
  buildsByVersion: Map<SolidityBuildVersion, SoliditiyGitBuildInfo>;
  buildsByLongVersion: Map<SolidityLongBuildVersion, SoliditiyGitBuildInfo>;
}

/**
 * Enriched information about a solidity build target
 */
export interface SolidityBuildInfo {
  /**
   * Configuration relating to build architecture
   */
  archConfig: SolidityArchConfig;

  /**
   * Build details
   */
  git: SoliditiyGitBuildInfo;

  /**
   * Compiler's name and parsed details from it
   */
  nameDetail: SolidityCompilerNameDetails;
}

/**
 * Platforms with solidity binaries, or wasm
 */
// eslint-disable-next-line no-shadow
export enum SolidityPlatform {
  LinuxAmd64,
  MacosAmd64,
}

/**
 * Array of solidity platforms
 * 
 * @note: should be kept in sync with {@link SolidityPlatform}
 */
export const SOLIDITY_PLATFORMS = [
  SolidityPlatform.LinuxAmd64,
  SolidityPlatform.MacosAmd64,
]

/**
 * Enhance the readability of solidity build lists
 * 
 * @param list  raw lists from remote source
 * @returns     enriched lists
 */
export function enrichSolidityBuildList(
  list: SolidityPlatformReleasesRaw,
): SolidityPlatformReleases {
  return {
    ...list,
    buildsByVersion: new Map(list
      .builds
      .map(build => [build.version, build])),
    buildsByLongVersion: new Map(list
      .builds
      .map(build => [build.longVersion, build])),
  }
}


/**
 * Get the compiler's version and commit from it's name
 * 
 * @param compilerName    name of the compiler
 * @returns               parsed version and commit
 */
export function parseSolidityCompilerName(
  compilerName: SolidityCompilerName,
): SolidityCompilerNameDetails {
  const regex = /v?(\d+\.\d+\.\d+)\+commit\.([a-f0-9]+)/;
  const match = compilerName.match(regex);
  assert(match, `value "${compilerName}" is not a valid solidity filename`);
  const [,version, commit] = match; const [,major, minor,patch] = version.match(/(\d+)\.(\d+)\.(\d+)/)!;
  const longVersion: SolidityLongBuildVersion = `${major}.${minor}.${patch}+commit.${commit}`;
  return {
    compilerName,
    version,
    commit,
    longVersion,
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
  }
}

/**
 * Is the solidity output a success?
 *
 * @param output 
 * @returns 
 */
export function isSolidityOutputOk(
  output: CompilerOutput
): output is CompilerOutputOk {
  return hasOwn(output, 'contracts');
}

/**
 * Get the string filesystem safe name of a solidity platform
 *
 * @param platform  solidity platform
 * @returns         filesystem safe name of the platform
 */
export function getSolidityPlatformName(platform: SolidityPlatform): string {
  switch (platform) {
    case SolidityPlatform.LinuxAmd64: return 'linuxamd64';
    case SolidityPlatform.MacosAmd64: return 'macosamd64';
    default: throw new Error(`unexpected platform ${platform}`);
  }
  //
}

/**
 * Get the solidity platform supported by this machine
 *
 * @returns     solidity platform of this machine
 */
export function getSolditiyPlatform(): null | SolidityPlatform {
  const arch = os.arch();
  const platform = os.platform();

  // must be amd64
  if (arch !== 'x64') return null;

  switch (platform) {
    case 'linux': return SolidityPlatform.LinuxAmd64;
    // TODO: will this work in cygwin?
    // macos
    case 'darwin': return SolidityPlatform.MacosAmd64;
    // case 'cygwin': return BUILD_LIST_URIS.WINDOWS_AMD_64;
    // // case 'win32': return BUILD_LIST_URIS.WINDOWS_AMD_64;
    default: return null;
  }
}

/**
 * Compile using a solidity Emscripten build
 *
 * @param compilerFilename    filename of the compiler file
 * @param input               compiler input
 * @returns                   compiler output as a string
 */
export function solidityCompileWasmRaw(
  compilerFilename: string,
  input: CompilerInput
): string {
  /** Solidity Emscripten module */
  interface SolidityCompilerWasm extends EmscriptenModule {
    cwrap: typeof cwrap;
    ccall: typeof ccall;
  }

  /** Solidity Compilation Function as parsed from the Emscripten Module */
  interface SolidityEmscriptenCompile { (inputString: string): string; }

  /** Frees memory */
  interface SolidityEmscriptenReset { (): void; }

  // eslint-disable-next-line import/no-dynamic-require, global-require
  const wasm: SolidityCompilerWasm = require(fabs(compilerFilename));

  // get the reset function
  let reset: undefined | SolidityEmscriptenReset;
  if ('_solidity_reset' in wasm) {
    const name =  'solidity_reset';
    const ret = null;
    const args: Emscripten.JSType[] = [];
    reset = wasm.cwrap(name, ret, args);
  }

  // get the compile function
  let compile: undefined | SolidityEmscriptenCompile;
  if ('_solidity_compile' in wasm) {
    const name = 'solidity_compile';
    const ret = 'string';
    const args: Emscripten.JSType[] = ['string', 'number', 'number'];
    compile = wasm.cwrap(name, ret, args) as SolidityEmscriptenCompile
  } else if ('_compileStandard' in wasm) {
    const name = 'compileStandard';
    const ret = 'string';
    const args: Emscripten.JSType[] = ['string', 'number'];
    compile = wasm.cwrap(name, ret, args) as SolidityEmscriptenCompile
  }

  assert.ok(compile, '"compile" function not found in wasm');

  try {
    // execute the compile function
    const out = compile(JSON.stringify(input));
    return out;
  } finally {
    // free memory
    // @see https://github.com/ethereum/solc-js/blob/master/wrapper.ts
    // Explicitly free memory.
    //
    // NOTE: cwrap() of "compile" will copy the returned pointer into a
    //       Javascript string and it is not possible to call free() on it.
    //       reset() however will clear up all allocations.
    if (reset) reset();
  }
}

/**
 * Compile using the solc library
 *
 * @param compilerFilename    filename of the compiler file
 * @param input               compiler input
 * @returns                   compiler output as a string
 */
export function solidityCompileWasmSolc(
  compilerFilename: string,
  input: CompilerInput,
): string {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const wasm = require(compilerFilename);
  const compiler = solc.setupMethods(wasm);
  const output = compiler.compile(JSON.stringify(input));
  // delete from cache
  // note: doesn't seem help clean up solidity faster...
  // const deleted = delete require.cache[path.resolve(compilerFilename)];
  // log.info(`deleted ${compilerFilename}: ${deleted}`);
  return output;
}

export interface ISolidityArchConfigBase {
  /**
   * Directory basename for compilers of this architecture
   */
  dirBasename: string;

  /**
   * URI to json list of releases for this platform
   */
  listUri: () => string;

  /**
   * Get the raw URI to download a build
   */
  buildUri: (build: SoliditiyGitBuildInfo) => string;
}

export interface SolidityArchConfigWasm extends ISolidityArchConfigBase {
  isWasm: true;
  platform: null;
}

export interface SolidityArchConfigNative extends ISolidityArchConfigBase {
  isWasm: false;
  platform: SolidityPlatform; 
}

/**
 * Configuration relating to a build architecture
 */
export type SolidityArchConfig =
  | SolidityArchConfigWasm
  | SolidityArchConfigNative;

/**
 * Configuration for accessing remote Solidity WebAssembly Builds
 *
 * @see [GitHub](https://github.com/ethereum/solc-bin/tree/gh-pages/wasm)
 *
 * @see [json](https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/wasm/list.json)
 */
export const SOLIDITY_WASM_ARCH: SolidityArchConfigWasm = {
  dirBasename: 'wasm',
  listUri: () => 'https://binaries.soliditylang.org/wasm/list.json',
  buildUri: (build) => `https://binaries.soliditylang.org/wasm/${build.path}`,
  isWasm: true,
  platform: null,
}

/**
 * Endpoints for solidity binaries on supported platforms
 */
export const SOLIDITY_PLATFORM_ARCHS: Record<SolidityPlatform, SolidityArchConfigNative> = {
  /**
   * List of Linux compiler builds
   *
   * @see [GitHub](https://github.com/ethereum/solc-bin/blob/gh-pages/linux-amd64)
   *
   * @see [json](https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/linux-amd64/list.json)
   */
  [SolidityPlatform.LinuxAmd64]: {
    dirBasename: 'linuxamd64',
    isWasm: false,
    platform: SolidityPlatform.LinuxAmd64,
    listUri: () => 'https://binaries.soliditylang.org/linux-amd64/list.json',
    buildUri: (build) => `https://binaries.soliditylang.org/linux-amd64/${build.path}`,
  },

  /**
   * MacOS builds
   *
   * @see [GitHub](https://github.com/ethereum/solc-bin/tree/gh-pages/macosx-amd64)
   * 
   * @see [json](https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/macosx-amd64/list.json)
   */
  [SolidityPlatform.MacosAmd64]: {
    dirBasename: 'macosamd64',
    isWasm: false,
    platform: SolidityPlatform.MacosAmd64,
    listUri:() =>  'https://binaries.soliditylang.org/macosx-amd64/list.json',
    buildUri: (build) => `https://binaries.soliditylang.org/macosx-amd64/${build.path}`,
  },
}


/**
 * Get the compilername from a contract's config
 *
 * @param config    config to get compilername from
 * @returns         compilername
 */
export function getCompilerName(config: ContractConfig): string {
  return config.compiler;
}

/**
 * Immutably remove asts from the solidity compilation output
 *
 * Sources have ast's which may be slightly different for different compiler
 * architectures for some reason
 * 
 * For example, on some contracts solidity binary compilers will seemingly overflow
 * on "referencedDeclaration" and "overloadDeclarations" values, whereas the wasm
 * compiler will not, producing different output artifacts despite containing
 * equivalent abi's, sourcecode, etc
 *
 * @param output    raw output from compiler
 * @returns         output with asts removed
 */
export function solidityOutputRemoveAsts(
  output: CompilerOutput,
): CompilerOutput {
  // immutably remove "ast" from outputs
  if (!hasOwn(output, 'contracts' as keyof CompilerOutput)) return output;
  const ret: CompilerOutput = { ...output, };
  ret.sources = { ...ret.sources };
  for (const basename of Object.keys(ret.sources)) {
    ret.sources[basename] = { ...ret.sources[basename] };
    delete ret.sources[basename].ast;
  }
  return ret;
}
