import path from "node:path";
import fs from "node:fs";
import { Contract } from "../../src/models/contract";
import { ContractStorage } from "../../src/models/contract.storage";
import { Address, ChainId, CompiledOutput } from "../../src/types";

/**
 * Represents a contract that we can use with tests
 */
export class TestContract implements Contract {
  constructor(public readonly contract: Contract) {}

  public get address(): Address {
    return this.contract.address;
  };

  public get name(): string {
    return this.contract.name;
  };

  public get chainId(): ChainId {
    return this.contract.chainId;
  };

  public get storage(): ContractStorage {
    return this.contract.storage;
  };

  /**
   * Absolute filename of the contract's compiled output
   *
   * @returns
   */
  getOutputFilename(): string {
    return path.join(
      this.contract.storage.getDirname(),
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
