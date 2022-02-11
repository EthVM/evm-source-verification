import { ContractConfig, ContractInput, ContractMetadata } from '../types';
import { IContractStorage } from './contract.storage';

/**
 * Contract configuration
 */
export interface MemoryContractOptions {
  /**
   * Contract's config
   */
  readonly config?: ContractConfig;

  /**
   * Contract's input
   */
  readonly input?: ContractInput;

  /**
   * Contract's metadata
   */
  readonly metadata?: ContractMetadata;
}


/**
 * Contract that exists only in memory
 */
export class MemoryContract implements IContractStorage {
  /**
   * Contract's config
   */
  private config?: ContractConfig;

  /**
   * Contract's input
   */
  private input?: ContractInput;

  /**
   * Contract's input
   */
  private metadata?: ContractMetadata;

  /**
   * Create a new Contract
   * 
   * @param options     options for the contract
   */
  constructor(options?: MemoryContractOptions) {
    this.config = options?.config;
    this.input = options?.input;
    this.metadata = options?.metadata;
  }

  /**
   * @inheritdoc
   */
  hasMetadata(): Promise<boolean> {
    return Promise.resolve(!!this.metadata);
  }

  /**
   * @inheritdoc
   */
  hasConfig(): Promise<boolean> {
    return Promise.resolve(!!this.config);
  }

  /**
   * @inheritdoc
   */
  hasInput(): Promise<boolean> {
    return Promise.resolve(!!this.input);
  }

  /**
   * @inheritdoc
   */
  async saveMetadata(metadata: ContractMetadata): Promise<void> {
    this.metadata = metadata;
  }

  /**
   * @inheritdoc
   */
  getConfig(): Promise<ContractConfig> {
    if (!this.config) throw new Error(`MemoryContract has no config`);
    return Promise.resolve(this.config);
  }

  /**
   * @inheritdoc
   */
  getInput(): Promise<ContractInput> {
    if (!this.input) throw new Error(`MemoryContract has no input`);
    return Promise.resolve(this.input);
  }
}
