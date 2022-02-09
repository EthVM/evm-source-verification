import path from "node:path";
import { getDiffs } from "../../libs/diffs";
import { randomAddress, randomChainId } from "../../libs/utils";
import { ContractService, IContractService } from "../../services/contract.service";
import { handleValidateGitDiffsCommand } from "./validate-git-diffs.handler";

const {
  getContractsWithoutConfigOrInput,
  getNonAdditions,
  getNonContractLikeFilenames,
  getUnknownContractLikeFilenames,
} = handleValidateGitDiffsCommand;

describe('validate-git-diffs', () => {
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

  let contractService: IContractService;

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
            dir: (contractService as ContractService)
              .getAddressDirname({ chainId: id, address, }),

            configFile: (contractService as ContractService)
              .getConfigFilename({ chainId: id, address }),

            inputFile: (contractService as ContractService)
              .getInputFilename({ chainId: id, address }),
            otherFiles: [],
          })),
      }));
  });

  describe('getNonAdditions', () => {
    it('should throw if diff includes non-addition mutations', () => {
      const tChain = tChains[Math.floor(tChains.length / 2)];
      const tContract = tChain.contracts[Math.floor(tChain.contracts.length / 2)];

      // expect pass before adding mutations
      expect(getNonAdditions(tDiffs).length).toEqual(0);

      // expect fail after adding mutations
      const modifiedFile = `${tContract.dir}/otherfile`;
      tDiffs.all.push(modifiedFile);
      tDiffs.modified.push(modifiedFile);
      expect(getNonAdditions(tDiffs)).toEqual([modifiedFile]);
    });
  });

  describe('getNonContractLikeFilenames', () => {
    // it('should throw if input.json was not added', () => {
    it('should get only filenames that are not contract-like', () => {
      const chainId = randomChainId();
      const address = randomAddress();
      const contractFilenames = [
        (contractService as ContractService)
          .getConfigFilename({ chainId, address }),
        (contractService as ContractService)
          .getInputFilename({ chainId, address }),
      ];
      const nonContractLikeFilenames = [
        '/non-contract-filename',
        '/non/contract/filename',
        './non-contract-filename',
        './non/contract/filename',
      ]
      const filenames: string[] = [
        ...contractFilenames,
        ...nonContractLikeFilenames,
      ];
      const chains = contractService.parseContractFilenames(filenames);

      expect(getNonContractLikeFilenames(contractFilenames, chains))
        .toEqual([]);

      expect(getNonContractLikeFilenames(nonContractLikeFilenames, chains))
        .toEqual(nonContractLikeFilenames);

      expect(getNonContractLikeFilenames(filenames, chains))
        .toEqual(nonContractLikeFilenames);
    });
  });

  describe('getUnknownContractLikeFilenames', () => {
    // it('should throw if input.json was not added', () => {
    it('should get only contract-like filenames that are unknown', () => {
      const chainId = randomChainId();
      const address = randomAddress();
      const contractFilenames = [
        (contractService as ContractService)
          .getConfigFilename({ chainId, address }),
        (contractService as ContractService)
          .getInputFilename({ chainId, address }),
      ];
      const unknownContractLikeFilenames = [
        path.join(
          (contractService as ContractService)
            .getAddressDirname({ chainId, address }),
          'other-contract-like-1'),
        path.join(
          (contractService as ContractService)
            .getAddressDirname({ chainId, address }),
          './other-contract-like-2'),
      ];
      const nonContractLikeFilenames = [
        '/non-contract-filename',
        '/non/contract/filename',
        './non-contract-filename',
        './non/contract/filename',
      ]
      const filenames: string[] = [
        ...contractFilenames,
        ...unknownContractLikeFilenames,
        ...nonContractLikeFilenames,
      ];
      const chains = contractService.parseContractFilenames(filenames);

      expect(getUnknownContractLikeFilenames(contractFilenames, chains))
        .toEqual([]);

      expect(getUnknownContractLikeFilenames(unknownContractLikeFilenames, chains))
        .toEqual(unknownContractLikeFilenames);

      expect(getUnknownContractLikeFilenames(nonContractLikeFilenames, chains))
        .toEqual([]);

      expect(getUnknownContractLikeFilenames(filenames, chains))
        .toEqual(unknownContractLikeFilenames);
    });
  });

    // TODO:
    // it('should extract contracts and chains that were added', () => {
    //   const files: string[] = getTestFiles();
    //   tDiffs.all = files;
    //   tDiffs.added = files;
    //   const opts: MatchContractFileOptions = {
    //     requireConfigFile: true,
    //     requireInputFile: true
    //   };
    //   const oChains = matchContractFiles(files, contractService, opts);

    //   for (const tChain of tChains) {
    //     // chain was extracted
    //     expect(oChains.has(tChain.id)).toBeTruthy();
    //     const oChain = oChains.get(tChain.id)!;

    //     // chainId was mapped correcfly
    //     expect(oChain.id).toBe(tChain.id);

    //     for (const tContract of tChain.contracts) {
    //       // contract was extracted
    //       expect(oChain.contracts.has(tContract.address)).toBeTruthy();
    //       const oContract = oChain.contracts.get(tContract.address)!

    //       // address mapped correctly
    //       expect(oContract.address).toBe(tContract.address);

    //       // dir mapped correctly
    //       expect(oContract.dir).toBe(tContract.dir);

    //       // input & config files mapped correctly
    //       expect(oContract.hasInput).toBeTruthy();
    //       expect(oContract.files.includes(tContract.inputFile)).toBeTruthy();
    //       expect(oContract.hasInput).toBeTruthy();
    //       expect(oContract.files.includes(tContract.configFile)).toBeTruthy();
    //     }
    //   }
    // });
  // });
});