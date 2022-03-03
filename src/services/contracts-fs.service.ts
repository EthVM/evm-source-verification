import { Contract, ICreateContractOptions } from "../models/contract";
import { BaseContractsFsService } from "./contracts-fs.service.base";

/**
 * Contract Filesystem Service
 *
 * Provides access to contracts in the filesystem and surrounding utilities
 */
export class ContractsFsService extends BaseContractsFsService<Contract> {
  /**
   * Create a new contract
   *
   * @inheritdoc
   */
  // eslint-disable-next-line class-methods-use-this
  protected createContract(options: ICreateContractOptions): Contract {
    return new Contract(options);
  }
}
