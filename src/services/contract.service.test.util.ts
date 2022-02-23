import path from "node:path";
import { TestContract } from "../models/contract.test.util";
import { ContractService } from "./contract.service";

/**
 * ContractService bound to the test-case contracts instead of the live
 * contracts
 */
export class TestContractService extends ContractService {
  constructor() {
    super({
      dirname: path.join(
        process.cwd(),
        'tests',
        'cases'
      ),
    });
  }

  /**
   * Get all test cases from the filesystem
   * 
   * @returns 
   */
  async getTestCases(): Promise<TestContract[]> {
    const contracts = await this.getContracts();
    return contracts.map(contract => new TestContract(contract));
  }
}