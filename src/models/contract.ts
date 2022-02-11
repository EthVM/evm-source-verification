import { Address, ChainId, ContractIdentity } from "../types";
import { IContractStorage } from "./contract.storage";


/**
 * Represents a contract
 */
export class Contract implements ContractIdentity {

  /**
   * Directory of the contract
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
   * Provides access to the contract's contents
   */
  public readonly storage: IContractStorage;

  /**
   * Name of the contract
   */
  public readonly name: string;

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
    storage: IContractStorage,
    name: string
  ) {
    this.chainId = chainId;
    this.address = address;
    this.storage = storage;
    this.name = name;
  }
}