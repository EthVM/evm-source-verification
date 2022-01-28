import { ContractService } from "../services/contract.service";
import { MatchContractFileOptions, matchContractFiles } from "./contracts.match";
import { getDiffs } from "./diffs";
import { randomAddress, randomChainId } from "./utils";

describe('contracts.match', () => {
  interface TestChain {
    id: number;
    // eslint-disable-next-line no-use-before-define
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

  let contractService: ContractService;

  beforeEach(() => {
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

    contractService = new ContractService();

    tChains = Array
      .from({ length: 5 }, randomChainId)
      .map((id): TestChain => ({
        id,
        contracts: Array
          .from({ length: 50 }, randomAddress)
          .map((address): TestContract => ({
            address,
            dir: contractService.getAddressDirname({ chainId: id, address }),
            configFile: contractService.getConfigFilename({ chainId: id, address }),
            inputFile: contractService.getInputFilename({ chainId: id, address }),
            otherFiles: [],
          })),
      }));
  });

  describe('matchContractFiles', () => {
    it('should throw if input.json was not added', () => {
      const chainId = randomChainId();
      const address = randomAddress();
      const files = [
        contractService.getConfigFilename({ chainId, address }),
      ];
      tDiffs.all.push(...files);
      tDiffs.added.push(...files);
      expect(() => matchContractFiles(
        files,
        contractService,
        { requireInputFile: true },
      )).toThrow();
    });

    it('should throw if config.json was not added', () => {
      const chainId = randomChainId();
      const address = randomAddress();
      const files = [
        `contracts/${chainId}/${address}/input.json`,
      ];
      tDiffs.all.push(...files);
      tDiffs.added.push(...files);
      expect(() => matchContractFiles(
        files,
        contractService,
        { requireConfigFile: true }
      )).toThrow();
    });

    it('should pass if input.json and config.json are included', () => {
      const chainId = randomChainId();
      const address = randomAddress();
      const files = [
        contractService.getInputFilename({ chainId, address }),
        contractService.getConfigFilename({ chainId, address }),
      ];
      tDiffs.all.push(...files);
      tDiffs.added.push(...files);

      const opts: MatchContractFileOptions = {
        requireConfigFile: true,
        requireInputFile: true
      };
      expect(() => matchContractFiles(
        files,
        contractService,
        opts,
      )).not.toThrow();
    });

    it('should extract contracts and chains that were added', () => {
      const files: string[] = getTestFiles();
      tDiffs.all = files;
      tDiffs.added = files;
      const opts: MatchContractFileOptions = {
        requireConfigFile: true,
        requireInputFile: true
      };
      const oChains = matchContractFiles(files, contractService, opts);

      for (const tChain of tChains) {
        // chain was extracted
        expect(oChains.has(tChain.id)).toBeTruthy();
        const oChain = oChains.get(tChain.id)!;

        // chainId was mapped correcfly
        expect(oChain.id).toBe(tChain.id);

        for (const tContract of tChain.contracts) {
          // contract was extracted
          expect(oChain.contracts.has(tContract.address)).toBeTruthy();
          const oContract = oChain.contracts.get(tContract.address)!

          // address mapped correctly
          expect(oContract.address).toBe(tContract.address);

          // dir mapped correctly
          expect(oContract.dir).toBe(tContract.dir);

          // input & config files mapped correctly
          expect(oContract.hasInput).toBeTruthy();
          expect(oContract.files.includes(tContract.inputFile)).toBeTruthy();
          expect(oContract.hasInput).toBeTruthy();
          expect(oContract.files.includes(tContract.configFile)).toBeTruthy();
        }
      }
    });

    describe('opts.onlyContractLikeFiles', () => {
      it('should throw if non-contract files were added', () => {
        const opts: MatchContractFileOptions = {
          onlyContractLikeFiles: true,
        };

        // tests pass before adding invalid files
        const filesValid = getTestFiles();
        expect(() => matchContractFiles(
          filesValid,
          contractService,
          opts,
        )).not.toThrow();

        // tests fail after adding invalid files
        const filesInvalid = [...filesValid, 'random', 'dir/file', '/rooted'];
        expect(() => matchContractFiles(
          filesInvalid,
          contractService,
          opts,
        )).toThrow();
      });
    })


    describe('opts.noUnknownContractFiles', () => {
      it('should throw if anything contract-like other than config.json and input.json were added', () => {
        const opts: MatchContractFileOptions = {
          noUnknownContractFiles: true,
        };

        const tChain = tChains[Math.floor(tChains.length / 2)];
        const tContract = tChain.contracts[Math.floor(tChain.contracts.length / 2)];

        // expect pass before adding invalid files
        const filesValid = getTestFiles();
        expect(() => matchContractFiles(filesValid, contractService, opts)).not.toThrow();

        // expect fail after adding invalid files
        const filesInvalid = [...filesValid, `${tContract.dir}/otherfile`];
        expect(() => matchContractFiles(filesInvalid, contractService, opts)).toThrow();
      });
    })
  });
});