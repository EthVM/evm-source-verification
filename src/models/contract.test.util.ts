/* eslint-disable lines-between-class-members */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import path from "node:path";
import fs from "node:fs";
import { Contract } from "./contract";
import { Address, ChainId, CompiledOutput } from "../types";

/**
 * Represents a contract that we can use with tests
 */
export class TestContract implements Contract {
  constructor(public readonly contract: Contract) {}

  get address(): Address { return this.contract.address; };
  get name(): string { return this.contract.name; };
  get chainId(): ChainId { return this.contract.chainId; };
  get getConfigFilename() { return this.contract.getConfigFilename; }
  get getDirname() { return this.contract.getDirname; }
  get getInputFilename() { return this.contract.getInputFilename; }
  get getMetadataFilename() { return this.contract.getMetadataFilename; }
  get hasConfig() { return this.contract.hasConfig; }
  get hasInput() { return this.contract.hasInput; }
  get hasMetadata() { return this.contract.hasMetadata; }
  get getConfig() { return this.contract.getConfig; }
  get getInput() { return this.contract.getInput; }
  get getMetadata() { return this.contract.getMetadata; }
  get saveMetadata() { return this.contract.saveMetadata; }
  get storage() { return this.contract.storage; }

  /**
   * Absolute filename of the contract's compiled output
   *
   * @returns
   */
  getOutputFilename(): string {
    return path.join(
      this.contract.getDirname(),
      'output.json',
    );
  }

  /**
   * Absolute filename of the contract's compiled output
   *
   * @returns
   */
  getOutput(): Promise<CompiledOutput> {
    return fs
      .promises
      .readFile(this.getOutputFilename())
      .then(buf => buf.toString('utf-8'))
      .then(JSON.parse.bind(JSON));
  }
}
