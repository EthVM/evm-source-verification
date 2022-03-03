import path from "node:path";
import fs from "node:fs";
import { CompilerOutputOk } from "../types";
import { IContractWithEthCode, IContractWithOutput, TestContract } from "./contract.test.util";

/**
 * Represents an contract that failed verification against the blockchain
 */
export class UnverifiedTestContract
  extends TestContract
  implements IContractWithOutput, IContractWithEthCode {
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
  getOutput(): Promise<CompilerOutputOk> {
    return fs
      .promises
      .readFile(this.getOutputFilename())
      .then(buf => buf.toString('utf-8'))
      .then(JSON.parse.bind(JSON));
  }

  /**
   * Absolute filename of the contract's blockchain eth code
   *
   * @returns
   */
  getEthCodeFilename(): string {
    return path.join(
      this.getDirname(),
      'eth_code',
    );
  }

  /**
   * Get the contract's eth code on the blockchain
   *
   * @returns
   */
  getEthCode(): Promise<string> {
    return fs
      .promises
      .readFile(this.getEthCodeFilename())
      .then(buf => buf.toString('utf-8'));
  }
}
