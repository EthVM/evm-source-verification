import { getDiffs } from "../libs/diffs";
import { randomAddress, randomChainId } from "../libs/utils";
import { ContractService } from "./contract.service";

describe('ContractService', () => {
  const addresses = [
    '0x00000000cd6eab3b2c4b0381247443b0cce5c40b',
    '0x0012eda08a762ff158e9b6401591db80ed875920',
    '0x0056f073898d5b38ca1841f8f5c3fd1d42ebb4cb',
    '0x005998df532de1820119e3ebd50fc90a4e8e8080',
    '0x005c78a48b482c1733c7cf958e65d90d3d40554b',
    '0x0092decca5e2f26466289011ad41465763bea4ce',
    '0x00a598499d111383975a000c415411b83d197afb',
    '0x00bab0294cf9c921198f9e00e0e220feaf19a3f0',
    '0x00c03008b0fcbc9b5a9841acf2e52d4afa82b408',
    '0x00c2cbdb5acb3bb80d1b3a6c293f149b889fe96c',
    '0x00c3923802e147f12204c7be2f5e536e8399d97c',
    '0x00ca1ef843e8503e9422dd2c0142a37d7adfc996',
    '0x00d54f129293b1580c779c8f04b2d8ce370ca69d',
    '0x00e36429c47056b22d4d46f02f77845ef90f01e1',
    '0x00e3ec1f55ce4f86cf7ac2bac8c0876a276e78d2',
    '0x00ed3446135b937fa12248443c377feb628e8809',
    '0x00ef6d929b76dfbf4b87d3796c76920708314fd1',
    '0x0103b9ad3e9f99f7c4059886ecb13908195c3d0f',
    '0x010f8086082b25e2b05d88c070ea1a12d4edd089',
    '0x01174185dcacb093c8768202ad045b7213c22804',
    '0x011912577bb6e83b7defbcadc7e85b9484003c90',
    '0x011d0278252320ec7607f2230f3db62c5f844c8e',
    '0x011e5846975c6463a8c6337eecf3cbf64e328884',
    '0x01234567bac6ff94d7e4f0ee23119cf848f93245',
    '0x014942f890d762f1a335649a5426e13b3bae0d6f',
    '0x014fb725ae52d805d14426cb6a7b4e7b9c4b73e2',
    '0x0160fb79e65bec0f16d750098951c26950adc5ed',
    '0x0167e9bcc26d02bf71113bbd1b6ea8c9549cd52c',
    '0x0169af6a48b13c19a614df9af863d2c55e6b5b48',
    '0x0170227514a274826685bf81aed06e4218175572',
    '0x017413445e227106fd198cb64547c615f4f13522',
    '0x01824357d7d7eaf4677bc17786abd26cbdec9ad7',
    '0x0186efe16d1b68d87d52cd7bbe9d202484b6f786',
    '0x018ef4797f4a048d59010a1942bbc3970545a656',
    '0x01a00e45926c3d541ea40f045de82cac9047ce54',
    '0x01a6fa5769b13302e82f1385e18baef7e913d0a7',
    '0x01af5d9f6a606a22f1becd36f3ef3336d776020d',
    '0x01bfa2248a6c1aa65e7032951d368241ff70b649',
    '0x01d360c54eb27a6a95ea1f8e309e5c8263ed8508',
    '0x01eb5241a82d277a801ed475363151e5e8d70ca9',
  ];

  interface TestEntry {
    original: string;
    dir: string;
    address: string;
    chainId: number;
    subpath: string;
  }

  const subpaths = [
    '/input.json',
    '/config.json',
    '/metadata.json',
    '/output.json',
    '/illegal.json',
    '/illegal/illegal.json',
    '',
  ]

  const contractService = new ContractService();

  const entries: TestEntry[] = addresses.map((address, i) => {
    const chainId = i % 101;
    const dir = `contracts/${chainId}/${address}`;
    const subpath = subpaths[i % subpaths.length];
    const original = dir + subpath;
    return { address, chainId, dir, original, subpath };
  });

  describe('match', () => {
    it('should extract chain info from file paths', () => {
      for (const entry of entries) {
        const match = contractService.match(entry.original);
        expect(match).toBeTruthy();
        expect(match!.original).toBe(entry.original);
        expect(match!.dir).toBe(entry.dir);
        expect(match!.chainId).toBe(entry.chainId);
        expect(match!.address).toBe(entry.address);
        expect(match!.subpath).toBe(entry.subpath);
      }
    });
  });

  // TODO:
  // describe('contracts.match', () => {
  //   interface TestChain {
  //     id: number;
  //     // eslint-disable-next-line no-use-before-define
  //     contracts: TestContract[]
  //   }

  //   interface TestContract {
  //     dir: string;
  //     address: string;
  //     configFile: string;
  //     inputFile: string;
  //     otherFiles: string[];
  //   }

  //   let tDiffs: getDiffs.Diffs;
  //   let tChains: TestChain[];

  //   const getTestFiles = (): string[] => {
  //     const files: string[] = tChains
  //       .flatMap((chain) => chain
  //         .contracts
  //         .flatMap(contract => [
  //           contract.inputFile,
  //           contract.configFile,
  //           ...contract.otherFiles,
  //         ]));
  //     return files;
  //   };

  //   beforeEach(() => {
  //     tDiffs = {
  //       added: [],
  //       addedModified: [],
  //       all: [],
  //       changed: [],
  //       copied: [],
  //       modified: [],
  //       removed: [],
  //       renamed: [],
  //     };

  //     tChains = Array
  //       .from({ length: 5 }, randomChainId)
  //       .map((id): TestChain => ({
  //         id,
  //         contracts: Array
  //           .from({ length: 50 }, randomAddress)
  //           .map((address): TestContract => ({
  //             address,
  //             dir: contractService.getAddressDirname({ chainId: id, address }),
  //             configFile: contractService.getConfigFilename({ chainId: id, address }),
  //             inputFile: contractService.getInputFilename({ chainId: id, address }),
  //             otherFiles: [],
  //           })),
  //       }));
  //   });

    // TODO:
    // describe('matchContractFiles', () => {
    //   it('should throw if input.json was not added', () => {
    //     const chainId = randomChainId();
    //     const address = randomAddress();
    //     const files = [
    //       contractService.getConfigFilename({ chainId, address }),
    //     ];
    //     tDiffs.all.push(...files);
    //     tDiffs.added.push(...files);
    //     expect(() => contractService.matchContractFiles(
    //       files,
    //       contractService,
    //       { requireInputFile: true },
    //     )).toThrow();
    //   });

    //   it('should throw if config.json was not added', () => {
    //     const chainId = randomChainId();
    //     const address = randomAddress();
    //     const files = [
    //       `contracts/${chainId}/${address}/input.json`,
    //     ];
    //     tDiffs.all.push(...files);
    //     tDiffs.added.push(...files);
    //     expect(() => matchContractFiles(
    //       files,
    //       contractService,
    //       { requireConfigFile: true }
    //     )).toThrow();
    //   });

    //   it('should pass if input.json and config.json are included', () => {
    //     const chainId = randomChainId();
    //     const address = randomAddress();
    //     const files = [
    //       contractService.getInputFilename({ chainId, address }),
    //       contractService.getConfigFilename({ chainId, address }),
    //     ];
    //     tDiffs.all.push(...files);
    //     tDiffs.added.push(...files);

    //     const opts: MatchContractFileOptions = {
    //       requireConfigFile: true,
    //       requireInputFile: true
    //     };
    //     expect(() => matchContractFiles(
    //       files,
    //       contractService,
    //       opts,
    //     )).not.toThrow();
    //   });

    //   it('should extract contracts and chains that were added', () => {
    //     const files: string[] = getTestFiles();
    //     tDiffs.all = files;
    //     tDiffs.added = files;
    //     const opts: MatchContractFileOptions = {
    //       requireConfigFile: true,
    //       requireInputFile: true
    //     };
    //     const oChains = matchContractFiles(files, contractService, opts);

    //     for (const tChain of tChains) {
    //       // chain was extracted
    //       expect(oChains.has(tChain.id)).toBeTruthy();
    //       const oChain = oChains.get(tChain.id)!;

    //       // chainId was mapped correcfly
    //       expect(oChain.id).toBe(tChain.id);

    //       for (const tContract of tChain.contracts) {
    //         // contract was extracted
    //         expect(oChain.contracts.has(tContract.address)).toBeTruthy();
    //         const oContract = oChain.contracts.get(tContract.address)!

    //         // address mapped correctly
    //         expect(oContract.address).toBe(tContract.address);

    //         // dir mapped correctly
    //         expect(oContract.dir).toBe(tContract.dir);

    //         // input & config files mapped correctly
    //         expect(oContract.hasInput).toBeTruthy();
    //         expect(oContract.files.includes(tContract.inputFile)).toBeTruthy();
    //         expect(oContract.hasInput).toBeTruthy();
    //         expect(oContract.files.includes(tContract.configFile)).toBeTruthy();
    //       }
    //     }
    //   });

    //   describe('opts.onlyContractLikeFiles', () => {
    //     it('should throw if non-contract files were added', () => {
    //       const opts: MatchContractFileOptions = {
    //         onlyContractLikeFiles: true,
    //       };

    //       // tests pass before adding invalid files
    //       const filesValid = getTestFiles();
    //       expect(() => matchContractFiles(
    //         filesValid,
    //         contractService,
    //         opts,
    //       )).not.toThrow();

    //       // tests fail after adding invalid files
    //       const filesInvalid = [...filesValid, 'random', 'dir/file', '/rooted'];
    //       expect(() => matchContractFiles(
    //         filesInvalid,
    //         contractService,
    //         opts,
    //       )).toThrow();
    //     });
    //   })


    //   describe('opts.noUnknownContractFiles', () => {
    //     it('should throw if anything contract-like other than config.json and input.json were added', () => {
    //       const opts: MatchContractFileOptions = {
    //         noUnknownContractFiles: true,
    //       };

    //       const tChain = tChains[Math.floor(tChains.length / 2)];
    //       const tContract = tChain.contracts[Math.floor(tChain.contracts.length / 2)];

    //       // expect pass before adding invalid files
    //       const filesValid = getTestFiles();
    //       expect(() => matchContractFiles(filesValid, contractService, opts)).not.toThrow();

    //       // expect fail after adding invalid files
    //       const filesInvalid = [...filesValid, `${tContract.dir}/otherfile`];
    //       expect(() => matchContractFiles(filesInvalid, contractService, opts)).toThrow();
    //     });
    //   })
    // });
  // });
});
