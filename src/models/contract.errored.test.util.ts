import path from "node:path";
import fs from "node:fs";
import { CompilerOutputErr } from "../types";
import { IContractWithOutput, TestContract } from "./contract.test.util";

/**
 * Represents a contract that errors during compilation
 */
export class ErroredTestContract
  extends TestContract
  implements IContractWithOutput {

  /**
   * Absolute filename of the contract's compiled output
   *
   * @returns
   */
  getOutputFilename(): string {
    return path.join(
      this.getDirname(),
      'output.json',
    );
  }

  /**
   * Get the contract's compiled output
   *
   * @returns
   */
  getOutput(): Promise<CompilerOutputErr> {
    return fs
      .promises
      .readFile(this.getOutputFilename())
      .then(buf => buf.toString('utf-8'))
      .then(JSON.parse.bind(JSON));
  }
}
