import path from 'node:path';
import fs from 'node:fs';
import { fabs, fexists, frel, isSafeFilename, mapGetOrCreate } from "../libs/utils";
import { IFileDownloader } from "./download.service";
import { ContractLanguage, getLanguageName } from '../libs/support';
import { HttpError } from '../errors/http.error';
import { logger } from '../logger';
import { CompilerNotFoundError } from '../errors/compiler-not-found.error';
import { getSolidityPlatformName, SolidityArchConfig, SolidityLongBuildVersion } from '../libs/solidity';

const log = logger.child({});

export interface SolidityFsServiceOptions {
  dirname?: string;
}

export interface DownloadCompilerOptions {
  /**
   * URI to download the compiler from
   */
  uri: string;

  /**
   * Filename to download the compiler to
   */
  filename: string;

  /**
   * Make the compiler executable?
   */
  makeExecutable: boolean;
}

export interface GetLanguageDirnameOptions {
  language: ContractLanguage;
}

export interface GetPlatformDirnameOptions extends GetLanguageDirnameOptions {
  archConfig: SolidityArchConfig;
}

export interface GetCompilerDirnameOptions extends GetPlatformDirnameOptions {}

export interface GetCompilerFilenameOptions extends GetPlatformDirnameOptions {
  longVersion: SolidityLongBuildVersion;
}

export interface ICompilerFsService {
  /**
   * Get the filename of an executable
   *
   * @param options   compiler settings to determine path
   * @returns         filename of the compiler
   */
  getCompilerFilename(options: GetCompilerFilenameOptions): string;

  /**
   * Download the compiler if we don't already have it
   *
   * Caches downloads so can be safely called on the same filename multiple times
   * 
   * @param uri 
   * @param filename 
   * @returns 
   */
  download(options: DownloadCompilerOptions): Promise<void>;
}

/**
 * Provides access to compilers on the filesystem
 */
export class CompilerFsService implements ICompilerFsService {
  private static readonly DEFAULTS = {
    DIRNAME: 'compilers',
  };

  /**
   * filename -> download
   *
   * Caches downloads
   */
  private readonly downloads = new Map<string, Promise<void>>();

  /**
   * Absolute direcetory name containing the solidity compilres
   * 
   * @example "../compilers"
   */
  private readonly dirname: string;

  /**
   * Create a new SolidityFilesystemService
   * 
   * @param downloadService
   * @param options
   */
  constructor(
    private readonly downloadService: IFileDownloader,
    options?: SolidityFsServiceOptions,
  ) {
    this.dirname = fabs(options?.dirname
      ?? CompilerFsService.DEFAULTS.DIRNAME);
  }

  /**
   * Get the filename of an executable
   *
   * @param arch            config for the compiler's architecture
   * @param longVersion     longVersion of the compiler
   * @returns               filename of the compiler
   */
  getCompilerFilename(options: GetCompilerFilenameOptions): string {
    const { archConfig, longVersion } = options;
    const dirname = this.getCompilerDirname(options);

    const compilerFilename = archConfig.isWasm
      ? path.join(dirname, `soljson-${longVersion}.js`)
      : path.join(dirname, `${longVersion}`);

    return compilerFilename;
  }

  /**
   * Get the absolute dirname for this compiler version
   *
   * @param options
   * @returns        absolute directory name for this compiler version
   */
  protected getCompilerDirname(options: GetCompilerDirnameOptions): string {
    return this.getPlatformDirname(options);
  }

  /**
   * Get the absolute directory name for compilers on `platform`
   *
   * @param options
   * @returns        absolute directory name for compilers of this platform
   */
  protected getPlatformDirname(options: GetPlatformDirnameOptions): string {
    const { archConfig: arch } = options;
    return path.join(
      this.getLanguageDirname(options),
      arch.isWasm ? 'wasm' : getSolidityPlatformName(arch.platform),
    );
  }

  /**
   * Get the absolute directory name for compilers of this language
   *
   * @param options
   * @returns        absolute directory name for compilers of this language
   */
  protected getLanguageDirname(options: GetLanguageDirnameOptions): string {
    const { language, } = options;
    return path.join(
      this.getDirname(),
      getLanguageName(language),
    );
  }

  /**
   * Get the absolute directory name for compilers
   * 
   * @returns   absolute directory name for compilers
   */
  protected getDirname(): string {
    return this.dirname;
  }

  /**
   * Download the compiler if we don't already have it
   *
   * Caches downloads so can be safely called on the same filename multiple times
   * 
   * @param uri 
   * @param filename 
   * @returns 
   */
  async download(options: DownloadCompilerOptions): Promise<void> {
    const { filename } = options;

    // cache the download
    const download = mapGetOrCreate(
      this.downloads,
      filename,
      () => this._download(options),
    );

    return download;
  }

  /**
   * Download the compiler
   * 
   * @param compilerFilename    absolute filename to download the compiler to
   * @param uri                 uri to download the compiler from
   * @param options             download options
   * @returns                   resolves after completion
   */
  private async _download(options: DownloadCompilerOptions): Promise<void> {
    const { makeExecutable, filename, uri, } = options;
    const compilerFilename = filename;

    const compilerBasename = path.basename(compilerFilename);

    if ((await fexists(compilerFilename))) return;

    // try to protect against malicious input
    if (!isSafeFilename(compilerBasename) || /\s/.test(compilerBasename))
      throw new Error(`compiler filename "${path.basename(compilerFilename)}" is not a safe filename`);

    const tmpDirname = path.join(path.dirname(compilerFilename), 'downloads');

    const tmp = path.join(tmpDirname, path.basename(compilerFilename));

    // ensure tmpDirname exists
    await fs.promises.mkdir(tmpDirname, { recursive: true });

    log.info(`downloading compiler "${compilerBasename}" -> "${frel(tmp)}"`);

    // try to download the compiler
    // if the compiler was not found, throw CompilerNotFound error
    // instead of http error
    // this lets consumers interpret the failure mode
    await this
      .downloadService
      .file(uri, tmp)
      .catch(err => {
        // must be http error
        if (!(err instanceof HttpError)) throw err;
        // must be 404 not found
        if (err.statusCode !== 404) throw err;
        // compiler not found
        // throw CompilerNotFound error instead
        const msg = `failed to find compiler ${compilerBasename} at url ${uri}`;
        throw new CompilerNotFoundError(msg);
      });

    // ensure compilers dir exists
    const compilerDirname = path.dirname(compilerFilename);

    if (!(await fexists(compilerDirname))) {
      // log.info(`creating ${frel(compilerDirname)}`);
      await fs.promises.mkdir(compilerDirname, { recursive: true });
    }

    if (makeExecutable) {
      // make the compiler executable
      // log.info(`chmod +x "${frel(tmp)}"`);
      await fs.promises.chmod(tmp, 0o700);
    }

    // mv to compiler to proper location
    // log.info(`mv "${frel(tmp)}" -> "${frel(compilerFilename)}"`);
    await fs.promises.rename(tmp, compilerFilename);

    // compiler ready to use
    log.info(`compiler "${compilerBasename}" is ready`);
  }
}