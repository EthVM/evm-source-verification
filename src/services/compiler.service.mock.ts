import { toChainId } from "../libs/utils";
import { TestContract } from "../models/contract.test.util";
import { ContractConfig, CompiledOutput } from "../types";
import { ICompilerService } from "./compiler.service";

/**
 * Pretend we "compile" contracts by storing the pre-compiled
 * test contracts and returning their output when requested
 * 
 * Makes tests way faster
 */
export class CompilerServiceMock implements ICompilerService {
  constructor(private readonly tcontracts: TestContract[]) {
    //
  }

  /**
   * Get the stored compiled output of a contract
   *
   * @param config    contract config
   * @returns         compiled output
   * @throws          if the config isn't from a test contract
   */
  async compile(config: ContractConfig): Promise<CompiledOutput> {
    for (const testContract of this.tcontracts) {
      if (toChainId(config.chainId) !== testContract.chainId) continue;
      if (config.address !== testContract.address) continue;
      // match
      return testContract.getOutput();
    }
    const msg = 'config & input do not match a test contract' +
      `  chainId=${config.chainId}` +
      `  address=${config.address}`;
    throw new Error(msg);
  }
}