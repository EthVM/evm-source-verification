import { ContractConfig, ContractInput, ContractMetadata } from "../types";

/**
 * Provides access to contract persistance
 */
export interface IContractStorage {
  /**
   * Save the metadata to storage
   * 
   * @param metadata 
   */
  saveMetadata(metadata: ContractMetadata): Promise<void>;

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
   * Get the contract's config
   *
   * @returns contract's input
   * @throws  if the contract's config does not exist
   */
  getConfig(): Promise<ContractConfig>;

  /**
   * Get the contract's input
   *
   * @returns contract's input
   * @throws  if the contract's input does not exist
   */
  getInput(): Promise<ContractInput>;
}