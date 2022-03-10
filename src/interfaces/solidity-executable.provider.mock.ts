import { ISolidityExecutable } from "../compilers/solidity.executable.interface";
import { SolidityBuildInfo } from "../libs/solidity";
import { IContractWithOutput } from "../models/contract.test.util";
import { CompilerOutput } from "../types";
import { LanguageServiceMock } from "./language.service.mock";
import { ISolidityExecutableProvider } from "./solidity-executable.provider.interface";

/**
 * Mock an executable provider
 *
 * Creates mock executables that simply returns the output from pre compiled contracts
 */
export class SolidityExecutableProviderMock implements ISolidityExecutableProvider {
  private readonly languageServiceMock: LanguageServiceMock;

  /**
   * Create a new SolidityExecutableProviderMock
   *
   * @param contracts   contracts with precompiled outputs
   */
  constructor(contracts: IContractWithOutput[]) {
    this.languageServiceMock = new LanguageServiceMock(contracts);
  }

  /**
   * Create function that returns the precompiled output
   *
   * @param build
   * @returns
   */
  async getExecutable(build: SolidityBuildInfo): Promise<ISolidityExecutable> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    const executable: ISolidityExecutable = {
      async compile(input): Promise<CompilerOutput> {
        const { compilerName } = build.nameDetail;
        const contract = await self
          .languageServiceMock
          .getContract({ compilerName, input })

        const output = await contract.getOutput();

        return output;
      }
    };

    return executable;
  }
}