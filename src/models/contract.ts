import {
  Address,
  ChainId,
  ContractConfig,
  IContractIdentity,
  CompilerInput,
  ContractMetadata,
} from "../types";
import { ContractStorage } from "./contract.storage";

export interface ICreateContractOptions {
  chainId: ChainId,
  address: Address,
  storage: ContractStorage,
  name: string
}

/**
 * Represents a smart contract
 */
export interface IContract extends IContractIdentity {
  /**
   * Name of the contract
   */
  readonly name: string;

  /**
   * Does the contract have a metadata file?
   *
   * @returns whether the contract has a metadata file
   */
  hasMetadata(): Promise<boolean>;

  /**
   * Does the contract have a config file?
   *
   * @returns whether the contract has a config file
   */
  hasConfig(): Promise<boolean>;

  /**
   * Does the contract have an input file?
   *
   * @returns whether the contract has an input file
   */
  hasInput(): Promise<boolean>;

  /**
   * Save the metadata to storage
   * 
   * @param metadata 
   */
  saveMetadata(metadata: ContractMetadata): Promise<void>;

  /**
   * Get the contract's config
   *
   * @returns contract's config
   * @throws  if the contract's config does not exist
   */
  getConfig(): Promise<ContractConfig>;

  /**
   * Get the contract's input
   *
   * @returns contract's input
   * @throws  if the contract's input does not exist
   */
  getInput(): Promise<CompilerInput>;

  /**
   * Get the contract's metadata
   *
   * @returns contract's metadata
   * @throws  if the contract's metadata does not exist
   */
  getMetadata(): Promise<ContractMetadata>;
}


/**
 * Represents a contract
 */
export class Contract implements IContract {
  /**
   * ChainId of the contract
   *
   * @example 1
   */
  public readonly chainId: ChainId;

  /**
   * Address of the contract
   *
   * @example "0x0a0bbc022542ebe87ab4f58b3960e7b6176f704d"
   */
  public readonly address: Address;

  /**
   * Name of the contract
   */
  public readonly name: string;

  /**
   * Provides access to the contract's location and contents
   */
  private readonly storage: ContractStorage;

  /**
   * Create a new Contract
   * 
   * @param options     contract options
   */
  constructor(
    options: ICreateContractOptions,
  ) {
    this.chainId = options.chainId;
    this.address = options.address;
    this.storage = options.storage;
    this.name = options.name;
  }

  /**
   * Does the contract have a metadata file?
   *
   * @returns whether the contract has a metadata file
   */
  hasMetadata(): Promise<boolean> {
    return this.storage.hasMetadata();
  }

  /**
   * Does the contract have a config file?
   *
   * @returns whether the contract has a config file
   */
  hasConfig(): Promise<boolean> {
    return this.storage.hasConfig();
  }

  /**
   * Does the contract have an input file?
   *
   * @returns whether the contract has an input file
   */
  hasInput(): Promise<boolean> {
    return this.storage.hasInput();
  }

  /**
   * Save the metadata to storage
   * 
   * @param metadata 
   */
  async saveMetadata(metadata: ContractMetadata): Promise<void> {
    return this.storage.saveMetadata(metadata);
  }

  /**
   * Get the contract's config
   *
   * @returns contract's config
   * @throws  if the contract's config does not exist
   */
  getConfig(): Promise<ContractConfig> {
    return this.storage.getConfig();
  }

  /**
   * Get the contract's input
   *
   * @returns contract's input
   * @throws  if the contract's input does not exist
   */
  getInput(): Promise<CompilerInput> {
    return this.storage.getInput();
  }

  /**
   * Get the contract's metadata
   *
   * @returns contract's metadata
   * @throws  if the contract's metadata does not exist
   */
  getMetadata(): Promise<ContractMetadata> {
    return this.storage.getMetadata();
  }

  /**
   * Get the absolute fs location of the contract's directory
   *
   * @returns absolute path of the contract contract's directory
   */
  protected getDirname(): string {
    return this.storage.getDirname();
  }

  /**
   * Get the absolute fs location of the contract's verified config file
   *
   * @returns absolute path of the contract's config file
   */
  protected getConfigFilename(): string {
    return this.storage.getConfigFilename();
  }

  /**
   * Get the absolute fs location of the contract's verified input file
   *
   * @returns absolute path of the contract's input file
   */
  protected getInputFilename(): string {
    return this.storage.getInputFilename();
  }

  /**
   * Get the absolute fs location of the contract's verified metadata file
   *
   * @returns absolute path of the contract's metadata file
   */
  protected getMetadataFilename(): string {
    return this.storage.getMetadataFilename();
  }
}