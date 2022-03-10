import { getCompilerName } from "../libs/solidity";
import { IContractWithOutput } from "../models/contract.test.util";
import { ContractConfig, CompilerOutputOk, CompilerInput } from "../types";
import { ICompilerService } from "./compiler.service.interface";
import { LanguageServiceMock } from "./language.service.mock";

/**
 * CompilerServiceMock
 *
 * "Compiles" contracts by returning their precomputed compiler output
 */
export class CompilerServiceMock implements ICompilerService {
  private readonly languageServiceMock: LanguageServiceMock;

  constructor(contracts: IContractWithOutput[]) {
    this.languageServiceMock = new LanguageServiceMock(contracts);
  }

  /**
   * Get the stored compiled output of a contract
   *
   * @param config    contract config
   * @param input     compiler input
   * @returns         compiled output
   * @throws          if the config isn't from a test contract
   */
  async compile(
    config: ContractConfig,
    input: CompilerInput
  ): Promise<CompilerOutputOk> {
    const compilername = getCompilerName(config);
    return this.languageServiceMock.compile(compilername, input);
  }
}