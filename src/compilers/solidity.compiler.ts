import fs from 'node:fs';
import path from "node:path";
import https from "node:https";
import { delay } from '@nkp/delay';
import { fexists, mapGetOrCreate, tmpFile, frel, isSafeFilename, pexecPipe, fabs } from "../libs/utils";
import { ContractInput, CompiledOutput, ICompiler } from "../types";

/**
 * Configuration options for the SolidityService
 */
export interface SolidityServiceOptions {
  dirname: string;
}

/**
 * Provides access to Solidity compilers
 */
export class SolidityCompiler implements ICompiler {
  public static DEFAULTS = {
    DIRNAME: 'compilers',
  }

  public readonly dirname: string;

  /**
   * 
   * @param dirname   directory name to save solidity compilers
   */
  constructor(options?: SolidityServiceOptions) {
    this.dirname = options?.dirname ?? SolidityCompiler.DEFAULTS.DIRNAME;
  }

  /**
   * Ongoing compiler downloads
   */
  private downloads: Map<string, Promise<void>> = new Map();


  /** {@link ICompiler.compile} */
  async compile(
    compilername: string,
    input: ContractInput,
  ): Promise<CompiledOutput> {
    // wait for the compiler to download
    const compilerFilename = this.getFilename(compilername);
    if (!(await fexists(compilerFilename))) {
      // lazily download the compiler, or wait for it's pending
      // download to complete
      await mapGetOrCreate(
        this.downloads,
        compilername,
        () => this.download(compilername));
    }

    // execute compilation
    const output: CompiledOutput = await solidityCompile(input, compilerFilename);
    return output;
  }


  /**
   * Download a solidity compiler
   *
   * @param compilername    name of the compiler to download
   */
  private async download(compilername: string): Promise<void> {
    // compiler filename
    const compilerFilename = this.getFilename(compilername);

    // try to protect against malicious input
    // TODO: how can we make this safer?
    if (!isSafeFilename(compilername) || /\s/.test(compilername))
      throw new Error(`compilername "${compilername}" is not a safe filename`);

    // TODO: remove use of `tmp`? seems to be causing file descriptor issues?
    // const [tmp] = await tmpFile({ discardDescriptor: true });
    const tmpDirname = path.join(path.dirname(compilerFilename), 'downloads');
    const tmp = path.join(tmpDirname, path.basename(compilerFilename));

    // ensure tmpDirname exists
    await fs.promises.mkdir(tmpDirname, { recursive: true });

    const url = `https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/linux-amd64/solc-linux-amd64-${compilername}`;
    console.info(`downloading compiler "${compilername}" -> "${tmp}"`);
    await new Promise<void>((res, rej) => https.get(url, (hres) => {
      const cws = fs.createWriteStream(tmp);
      hres.pipe(cws);
      cws.on('finish', res);
      cws.on('error', rej);
    }));

    // ensure compilers dir exists
    const dirname = path.dirname(compilerFilename);
    if (!(await fexists(dirname))) {
      console.info(`creating ${frel(dirname)}`);
      await fs.promises.mkdir(dirname, { recursive: true });
    }

    // make the compiler executable
    console.info(`chmod +x "${tmp}"`);
    await fs.promises.chmod(tmp, 0o700);

    // mv to compiler to proper location
    console.info(`mv "${tmp}" -> "${frel(compilerFilename)}"`);
    await fs.promises.rename(tmp, compilerFilename);

    // compiler ready to use
    console.info(`compiler "${compilername}" ("${compilerFilename}") is ready`);
  }


  /**
   * Get the filename of a solidity compiler
   * 
   * @param compilername    name of the compiler
   * @returns               filename of the compiler
   */
  private getFilename(compilername: string) {
    return path.join(this.dirname, `solc-${compilername}`);
  }
}


/**
 * Compile an input with solidity
 *
 * Use the compiler at the given filename
 *
 * @param input               compiler input json
 * @param compilerFilename    compiler executable
 * @returns                   compiler output json
 */
async function solidityCompile(
  input: ContractInput,
  compilerFilename: string
): Promise<CompiledOutput> {
  const cmd = `${fabs(compilerFilename)} --standard-json`;

  const { stderr, stdout } = await pexecPipe(
    cmd,
    JSON.stringify(input),
    {
      // 100 MiB
      maxBuffer: 100 * 1024 * 1024,
      shell: 'bash',
      timeout: 30_000,
    },
  );

  if (stderr) {
    const msg = 'WARNING: stderr from solidity:' +
      ` "${compilerFilename}": ${stderr}`;
    console.warn(msg);
  }

  const json: CompiledOutput = JSON.parse(stdout);

  return json;
}