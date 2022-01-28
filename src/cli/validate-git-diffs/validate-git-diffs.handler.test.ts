import { getDiffs } from "../../libs/diffs";
import { randomAddress, randomChainId } from "../../libs/utils";
import { ContractService, IContractService } from "../../services/contract.service";
import { validateDiffs } from "./validate-git-diffs.handler";

describe('validate.service', () => {
  interface TestChain {
    id: number;
    contracts: TestContract[]
  }

  interface TestContract {
    dir: string;
    address: string;
    configFile: string;
    inputFile: string;
    otherFiles: string[];
  }

  let tDiffs: getDiffs.Diffs;
  let tChains: TestChain[];

  let contractService: ContractService;

  const getTestFiles = (): string[] => {
    const files: string[] = tChains
      .flatMap((chain) => chain
        .contracts
        .flatMap(contract => [
          contract.inputFile,
          contract.configFile,
          ...contract.otherFiles,
        ]));
    return files;
  };

  beforeEach(() => {
    contractService = new ContractService();

    tDiffs = {
      added: [],
      addedModified: [],
      all: [],
      changed: [],
      copied: [],
      modified: [],
      removed: [],
      renamed: [],
    };

    tChains = Array
      .from({ length: 5 }, randomChainId)
      .map((id): TestChain => ({
        id,
        contracts: Array
          .from({ length: 50 }, randomAddress)
          .map((address): TestContract => ({
            address,
            dir: contractService.getAddressDirname({ chainId: id, address, }),
            configFile: contractService.getConfigFilename({ chainId: id, address }),
            inputFile: contractService.getInputFilename({ chainId: id, address }),
            otherFiles: [],
          })),
      }));
  });

  describe('validateDiffs', () => {
    describe('strict=false', () => {
      it('should NOT throw if diff includes non-addition mutations', () => {
        const tChain = tChains[Math.floor(tChains.length / 2)];
        const tContract = tChain.contracts[Math.floor(tChain.contracts.length / 2)];

        // expect pass before adding mutations
        expect(() => validateDiffs(tDiffs, { onlyAddedFiles: false })).not.toThrow();

        // expect pass after adding mutations
        const modifiedFile = `${tContract.dir}/otherfile`;
        tDiffs.modified.push(modifiedFile);
        expect(() => validateDiffs(tDiffs, { onlyAddedFiles: false })).not.toThrow();
      });
    })

    describe('strict=true', () => {
      it('should throw if diff includes non-addition mutations', () => {
        const tChain = tChains[Math.floor(tChains.length / 2)];
        const tContract = tChain.contracts[Math.floor(tChain.contracts.length / 2)];

        // expect pass before adding mutations
        expect(() => validateDiffs(tDiffs, { onlyAddedFiles: true })).not.toThrow();

        // expect fail after adding mutations
        const modifiedFile = `${tContract.dir}/otherfile`;
        tDiffs.all.push(modifiedFile);
        tDiffs.modified.push(modifiedFile);
        expect(() => validateDiffs(tDiffs, { onlyAddedFiles: true })).toThrow();
      });
    })
  });
});