import path from 'node:path';
import fs from 'node:fs';
import { fabs, fexists, writeJSONFile } from "../libs/utils";
import { ContractConfig, ContractInput, ContractMetadata } from '../types';
import { IContractStorage } from './contract.storage.interface';

/**
 * Contract configuration
 */
export interface FsContractOptions {
  /**
   * Basename of a config file
   *
   * @example "config.json"
   */
  readonly configBasename: string,


  /**
   * Basename of an input file
   *
   * @example "input.json"
   */
  readonly inputBasename: string;


  /**
   * Basename of a metadata file
   *
   * @example "metadata.json"
   */
  readonly metadataBasename: string;
}


/**
 * Contract that exists in the filesystem
 */
export class FsContract implements IContractStorage {
  /**
   * Directory of the contract
   *
   * @example "contracts/1/0x0a0bbc022542ebe87ab4f58b3960e7b6176f704d"
   */
  private readonly dirname: string;

  /**
   * Basename of a config file
   *
   * @example "config.json"
   */
  private readonly configBasename: string;

  /**
   * Basename of an input file
   *
   * @example "input.json"
   */
  private readonly inputBasename: string;

  /**
   * Basename of a metadata file
   *
   * @example "metadata.json"
   */
  private readonly metadataBasename: string;

  /**
   * Create a new Contract
   * 
   * @param dirname     directory that the contract is in
   * @param options     options for the contract
   */
  constructor(dirname: string, options: FsContractOptions) {
    this.dirname = dirname;
    this.configBasename = options.configBasename;
    this.inputBasename = options.inputBasename;
    this.metadataBasename = options.metadataBasename;
  }

  /**
   * @inheritdoc
   */
  hasMetadata(): Promise<boolean> {
    return fexists(this.getMetadataFilename());
  }

  /**
   * @inheritdoc
   */
  hasConfig(): Promise<boolean> {
    return fexists(this.getConfigFilename());
  }

  /**
   * @inheritdoc
   */
  hasInput(): Promise<boolean> {
    return fexists(this.getInputFilename());
  }

  /**
   * @inheritdoc
   */
  async saveMetadata(metadata: ContractMetadata): Promise<void> {
    await writeJSONFile(
      this.getMetadataFilename(),
      metadata,
    );
  }

  /**
   * @inheritdoc
   */
  getConfig(): Promise<ContractConfig> {
    // TODO: verify the file contents
    return fs
      .promises
      .readFile(this.getConfigFilename())
      .then(buf => buf.toString('utf-8'))
      .then(JSON.parse.bind(JSON));
  }

  /**
   * @inheritdoc
   */
  getInput(): Promise<ContractInput> {
    // TODO: verify the file contents
    return fs
      .promises
      .readFile(this.getInputFilename())
      .then(buf => buf.toString('utf-8'))
      .then(JSON.parse.bind(JSON));
  }

  /**
   * Get the absolute fs location of the contract's directory
   *
   * @returns contract's absolute dirname
   */
  private getDirname(): string {
    return fabs(this.dirname);
  }

  /**
   * Get the absolute fs location of the contract's verified config file
   *
   * @returns contract's absolute config filename
   */
  private getConfigFilename(): string {
    return path.join(
      this.getDirname(),
      this.configBasename,
    );
  }

  /**
   * Get the absolute fs location of the contract's verified input file
   *
   * @returns contract's absolute input filename
   */
  private getInputFilename(): string {
    return path.join(
      this.getDirname(),
      this.inputBasename,
    );
  }

  /**
   * Get the absolute fs location of the contract's verified metadata file
   *
   * @returns contract's absolute metadata filename
   */
  private getMetadataFilename(): string {
    return path.join(
      this.getDirname(),
      this.metadataBasename,
    );
  }
}
