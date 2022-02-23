import { Address, ChainId, ContractConfig, ContractIdentity, ContractInput, ContractMetadata } from "../types";
import { ContractStorage } from "./contract.storage";


/**
 * Represents a contract
 */
export class Contract implements ContractIdentity {

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
  public readonly storage: ContractStorage;

  /**
   * Create a new Contract
   * 
   * @param chainId     chainId of the contract
   * @param address     address of the contract
   * @param storage     contract's storage mechanism
   * @param name        name of the contract
   */
  constructor(
    chainId: ChainId,
    address: Address,
    storage: ContractStorage,
    name: string
  ) {
    this.chainId = chainId;
    this.address = address;
    this.storage = storage;
    this.name = name;
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
  getInput(): Promise<ContractInput> {
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
   * @returns contract's absolute dirname
   */
  getDirname(): string {
    return this.storage.getDirname();
  }

  /**
   * Get the absolute fs location of the contract's verified config file
   *
   * @returns contract's absolute config filename
   */
  getConfigFilename(): string {
    return this.storage.getConfigFilename();
  }

  /**
   * Get the absolute fs location of the contract's verified input file
   *
   * @returns contract's absolute input filename
   */
  getInputFilename(): string {
    return this.storage.getInputFilename();
  }

  /**
   * Get the absolute fs location of the contract's verified metadata file
   *
   * @returns contract's absolute metadata filename
   */
  getMetadataFilename(): string {
    return this.storage.getMetadataFilename();
  }
}