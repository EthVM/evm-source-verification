import fs from 'node:fs';
import path from 'node:path';
import { fabs } from '../../src/libs/utils';
import { CompiledOutput, ContractConfig, ContractIdentity, ContractInput, ContractMetadata } from "../../src/types";

/**
 * Represents a contract that we can run tests on
 */
export class TestCase implements ContractIdentity {
  /**
   * Absolute directoryname of the TestCase contract
   */
  public readonly dirname: string;


  /**
   * Address of the TestCase contract
   */
  public readonly address: string;


  /**
   * chainId of the TestCase contract
   */
  public readonly chainId: number;


  /**
   * Create a new Testcase
   *
   * @param identity    identity of the contract
   * @param dirname     directory with the contract's files
   */
  constructor(
    public readonly identity: ContractIdentity,
    dirname: string,
  ) {
    this.dirname = fabs(dirname);
    this.address = identity.address;
    this.chainId = identity.chainId;
  }


  /**
   * Get the test cases compiler config
   *
   * @returns     test cases compiler config
   */
  getConfig(): Promise<ContractConfig> {
    return fs
      .promises
      .readFile(this.getConfigFilename(), 'utf-8')
      .then(JSON.parse.bind(JSON));
  }


  /**
   * Get the test cases compiler input
   *
   * @returns     test cases compiler input
   */
  getInput(): Promise<ContractInput> {
    return fs
      .promises
      .readFile(this.getInputFilename(), 'utf-8')
      .then(JSON.parse.bind(JSON));
  }


  /**
   * Get the test cases compiled output
   *
   * @returns     test cases compiled output
   */
  getOutput(): Promise<CompiledOutput> {
    return fs
      .promises
      .readFile(this.getOutputFilename(), 'utf-8')
      .then(JSON.parse.bind(JSON));
  }


  /**
   * Get the test cases metadata
   *
   * @returns     test cases metadata
   */
  getMetadata(): Promise<ContractMetadata> {
    return fs
      .promises
      .readFile(this.getMetadataFilename(), 'utf-8')
      .then(JSON.parse.bind(JSON));
  }


  /**
   * Get the filename of the compiler config
   */
  getConfigFilename(): string {
    return path.join(this.dirname, 'configs.json');
  }


  /**
   * Get the filename of the compiler input
   */
  getInputFilename(): string {
    return path.join(this.dirname, 'input.json');
  }


  /**
   * Get the filename of the compiled output metadata
   */
  getMetadataFilename(): string {
    return path.join(this.dirname, 'metadata.json');
  }


  /**
   * Get the filename of the compiled output
   */
  getOutputFilename(): string {
    return path.join(this.dirname, 'output.json');
  }
}
