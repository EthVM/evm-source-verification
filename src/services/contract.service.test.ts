import path from "node:path";
import { TestContractService } from "../../tests/utils/test-contract-service";
import { randomAddress, randomChainId } from "../libs/utils";
import { ChainPath, ChainPaths, ContractPath } from "./contract.service";

describe('ContractService', () => {
  let tcontractService: TestContractService;

  function nomatch(pathname: string) {
    expect(tcontractService
      .matchContractFilename(pathname))
      .toBeNull();
  }


  beforeEach(() => {
    tcontractService = new TestContractService();
  });

  describe('matchContractFilename', () => {
    let entries: {
      address: string,
      chainId: number,
      dirname: string,
      original: string,
      subpath: string
    }[];
    beforeEach(() => {
      const subpaths = [
        '/input.json',
        '/config.json',
        '/metadata.json',
        '/output.json',
        '/illegal.json',
        '/illegal/illegal.json',
        '',
      ]
      const addresses = Array.from({ length: 40 }, randomAddress);
      entries = addresses.map((address, i) => {
        const chainId = (i % 99) + 1;
        const dirname = path.join(
          tcontractService.dirname,
          chainId.toString(),
          address,
        );
        const subpath = subpaths[i % subpaths.length];
        const original = dirname + subpath;
        return {
          address,
          chainId,
          dirname,
          original,
          subpath,
        };
      });
    });

    it('should match absolute contract-like filenames', async () => {
      for (const entry of entries) {
        const match = tcontractService.matchContractFilename(entry.original);
        expect(match).toBeTruthy();
        expect(match!.filename).toBe(entry.original);
        expect(match!.dirname).toBe(entry.dirname);
        expect(match!.chainId).toBe(entry.chainId);
        expect(match!.address).toBe(entry.address);
        expect(match!.subpath).toBe(entry.subpath);
      }
    });

    it('should match relative contract-like filenames', async () => {
      for (const entry of entries) {
        entry.dirname = path.relative(process.cwd(), entry.dirname);
        entry.original = path.relative(process.cwd(), entry.original);
        const match = tcontractService.matchContractFilename(entry.original);
        expect(match).toBeTruthy();
        expect(path.relative(process.cwd(), match!.filename)).toBe(entry.original);
        expect(path.relative(process.cwd(), match!.dirname)).toBe(entry.dirname);
        expect(match!.chainId).toBe(entry.chainId);
        expect(match!.address).toBe(entry.address);
        expect(match!.subpath).toBe(entry.subpath);
      }
    });

    describe('should not match non-contract-like filenames', () => {
      describe('with incomplete filenames', () => {
        it('with just the dirname', () => {
          nomatch(tcontractService.dirname);
        });

        it('with dirname + chainId', () => {
          nomatch(path.join(
            tcontractService.dirname,
            randomChainId().toString(),
          ));
        });

        it('with dirname + address', () => {
          nomatch(path.join(
            tcontractService.dirname,
            randomAddress(),
          ));
        });

        describe('with dirname + invalid chainId + address', () => {
          it('adding invalid char after chainId', () => {
            nomatch(path.join(
              tcontractService.dirname,
              `${randomChainId().toString()}a`,
              randomAddress(),
            ));
          });

          it('adding invalid char before chainId', () => {
            nomatch(path.join(
              tcontractService.dirname,
              `a${randomChainId().toString()}`,
              randomAddress(),
            ));
          });
        });

        describe('with dirname + chainId + invalid address', () => {
          it('removing the first address char', () => {
            nomatch(path.join(
              tcontractService.dirname,
              randomChainId().toString(),
              // remove first char
              randomAddress().replace(/^./, ''),
            ));
          })

          it('removing the last address char', () => {
            nomatch(path.join(
              tcontractService.dirname,
              randomChainId().toString(),
              // remove last char
              randomAddress().replace(/.$/, ''),
            ));
          });

          it('adding a valid hex char to address', () => {
            nomatch(path.join(
              tcontractService.dirname,
              randomChainId().toString(),
              // add a valid hex char
              `${randomAddress()}0`,
            ));
          });

          it('adding 2 valid hex chars to address', () => {
            nomatch(path.join(
              tcontractService.dirname,
              randomChainId().toString(),
              // add 2 valid hex char
              `${randomAddress()}00`,
            ));
          });

          it('replacing a valid hex char in address', () => {
            nomatch(path.join(
              tcontractService.dirname,
              randomChainId().toString(),
              // replace a hex char with an invalid hex char
              randomAddress().replace(/^0x./, '0xg'),
            ));
          });
        });
      });
    });
  });

  describe('matchContractFilenames', () => {
    let expected: ChainPaths;
    let filenames: string[];
    let unknownFilenames: string[];

    beforeEach(() => {
      filenames = [];
      unknownFilenames = [];

      // create n random filenames
      for (let i = 0; i < 10; i += 1) {
        // create a random filename
        let unknownFilename = '';
        for (let j = 0; j < 10; j += 1) {
          unknownFilename += Math.floor(16 * Math.random()).toString(16);
        }
        unknownFilenames.push(unknownFilename);
        filenames.push(unknownFilename);
      }

      // build up expected chains & contract matches
      const chainIds = Array.from({ length: 10 }, randomChainId);
      const addresses = Array.from({ length: 40 }, randomAddress);
      expected = new Map();
      for (const chainId of chainIds) {
        const chainPath: ChainPath = {
          contracts: new Map(),
          id: chainId,
        };
        expected.set(chainId, chainPath);
        for (const address of addresses) {
          const contractDirname = path.join(
            tcontractService.dirname,
            chainId.toString(),
            address,
          );
          const configFilename = path.join(
            contractDirname,
            'configs.json',
          );
          filenames.push(configFilename);
          const inputFilename = path.join(
              contractDirname,
              'input.json',
          );
          filenames.push(inputFilename);
          const metadataFilename = path.join(
            contractDirname,
            'metadata.json',
          );
          filenames.push(metadataFilename);
          const contractPath: ContractPath = {
            chainId,
            address,
            dirname: contractDirname,
            configFilename,
            inputFilename,
            metadataFilename,
            unknown: [],
          };
          chainPath.contracts.set(address, contractPath)
        };
      };
    });
    
    it('should match absolute contract-like filenames', async () => {
      const { chains: actual, unmatched } = tcontractService.matchContractFilenames(filenames);

      // assert unmatched files were filtered out
      expect(unmatched).toEqual(unknownFilenames);

      // assert all chains matched
      expect(Array.from(actual.keys()).sort()).toEqual(Array.from(expected.keys()).sort());

      // assert the contents of all chains is equivalent
      for (const [chainId, actualChain] of actual.entries()) {
        const expectedChain = expected.get(chainId)!;
        expect(actualChain.id).toBe(expectedChain.id);

        // assert to contain the same contracts
        expect(Array.from(actualChain.contracts.keys()).sort())
          .toEqual(Array.from(expectedChain.contracts.keys()).sort());

        // assert contents of all contracts to be equivalent
        for (const [address, actualContract] of actualChain.contracts.entries()) {
          const expectedContract = expectedChain.contracts.get(address)!;
          expect(actualContract.address).toBe(expectedContract.address);
          expect(actualContract).toEqual(expectedContract);
        }
      }
    });
  });
});
