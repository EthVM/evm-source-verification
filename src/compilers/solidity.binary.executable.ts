import { SOLIDITY_MAX_OUTPUT_BUFFER_SIZE, SOLIDITY_BINARY_COMPILE_TIMEOUT } from "../constants";
import { solidityNormaliseOutputs } from "../libs/solidity";
import { fabs, pexecPipe } from "../libs/utils";
import { logger } from "../logger";
import { CompilerInput, CompilerOutput } from "../types";
import { ISolidityExecutable } from "./solidity.executable.interface";

const log = logger.child({});

/**
 * Provides access to compilation
 */
export class SolidityBinaryExecutable implements ISolidityExecutable {
  /**
   * Absolute filename of the compiler
   */
  private readonly compilerFilename: string

  /**
   * Create a new SolditiyBinaryExecutable
   *
   * @param compilerFilename    filename of the compiler
   */
  constructor(compilerFilename: string) {
    this.compilerFilename = fabs(compilerFilename);
  }

  /**
   * Compile binary with binary shell
   * 
   * @param input     compiler input
   * @returns         compiled output
   */
  async compile(input: CompilerInput): Promise<CompilerOutput> {
    const { compilerFilename: filename } = this;
    const cmd = `${filename} --standard-json`;

    const { stderr, stdout, } = await pexecPipe(
      cmd,
      JSON.stringify(input),
      {
        maxBuffer: SOLIDITY_MAX_OUTPUT_BUFFER_SIZE,
        // shell: 'bash',
        timeout: SOLIDITY_BINARY_COMPILE_TIMEOUT,
      },
    );

    if (stderr) {
      const msg = 'WARNING: stderr from solidity:' +
        ` "${filename}": ${stderr}`;
      log.warn(msg);
    }

    // solidity outputs errors to stdout in json
    const output = JSON.parse(stdout) as CompilerOutput;

    const normalised = solidityNormaliseOutputs(output);

    return normalised;
  }
}