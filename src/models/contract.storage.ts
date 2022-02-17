import path from 'node:path';
import fs from 'node:fs';
import { fabs, fexists, writeJSONFile } from "../libs/utils";
import { ContractConfig, ContractInput, ContractMetadata } from '../types';

/**
 * Filesystem contract configuration
 */
export interface ContractStorageOptions {
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
export class ContractStorage {
  /**
   * Absolute directory of the contract
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
  constructor(dirname: string, options: ContractStorageOptions) {
    this.dirname = fabs(dirname);
    this.configBasename = options.configBasename;
    this.inputBasename = options.inputBasename;
    this.metadataBasename = options.metadataBasename;
  }

  /**
   * Does the contract have a metadata file?
   *
   * @returns whether the contract has a metadata file
   */
  hasMetadata(): Promise<boolean> {
    return fexists(this.getMetadataFilename());
  }

  /**
   * Does the contract have a config file?
   *
   * @returns whether the contract has a config file
   */
  hasConfig(): Promise<boolean> {
    return fexists(this.getConfigFilename());
  }

  /**
   * Does the contract have an input file?
   *
   * @returns whether the contract has an input file
   */
  hasInput(): Promise<boolean> {
    return fexists(this.getInputFilename());
  }

  /**
   * Save the metadata to storage
   * 
   * @param metadata 
   */
  async saveMetadata(metadata: ContractMetadata): Promise<void> {
    await writeJSONFile(
      this.getMetadataFilename(),
      metadata,
    );
  }

  /**
   * Get the contract's config
   *
   * @returns contract's input
   * @throws  if the contract's config does not exist
   */
  getConfig(): Promise<ContractConfig> {
    return fs
      .promises
      .readFile(this.getConfigFilename())
      .then(buf => buf.toString('utf-8'))
      .then(JSON.parse.bind(JSON));
  }

  /**
   * Get the contract's input
   *
   * @returns contract's input
   * @throws  if the contract's input does not exist
   */
  getInput(): Promise<ContractInput> {
    return fs
      .promises
      .readFile(this.getInputFilename())
      .then(buf => buf.toString('utf-8'))
      .then(JSON.parse.bind(JSON));
  }

  /**
   * Get the contract's metadata
   *
   * @returns contract's metadata
   * @throws  if the contract's metadata does not exist
   */
  getMetadata(): Promise<ContractMetadata> {
    return fs
      .promises
      .readFile(this.getMetadataFilename())
      .then(buf => buf.toString('utf-8'))
      .then(JSON.parse.bind(JSON));
  }

  /**
   * Get the absolute fs location of the contract's directory
   *
   * @returns contract's absolute dirname
   */
  public getDirname(): string {
    return fabs(this.dirname);
  }

  /**
   * Get the absolute fs location of the contract's verified config file
   *
   * @returns contract's absolute config filename
   */
  public getConfigFilename(): string {
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
  public getInputFilename(): string {
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
  public getMetadataFilename(): string {
    return path.join(
      this.getDirname(),
      this.metadataBasename,
    );
  }
}
