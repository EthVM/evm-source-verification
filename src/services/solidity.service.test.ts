import { CompilationError } from "../errors/compilation.error";
import { CompilerNotFoundError } from "../errors/compiler-not-found.error";
import { ErroredTestContract } from "../models/contract.errored.test.util";
import { UnverifiedTestContract } from "../models/contract.unverified.test.util";
import { VerifiedTestContract } from "../models/contract.verified.test.util";
import {
  TestErroredContractsFsService,
  TestUnverifiedContractsFsService,
  TestVerifiedContractsFsService,
} from "./contracts-fs.service.test.util";
import { DownloadService } from "./download.service";
import { SolidityService } from "./solidity.service";
import { SolidityReleaseProvider } from "./solidity-release.provider";
import { SolidityArchProvider } from "./solidity-arch.provider";
import { SolidityBuildProvider } from "./solidity-build.provider";
import { getCompilerName, SolidityCompilerName, solidityOutputRemoveAsts } from "../libs/solidity";
import { SolidityExecutableProviderMock } from "../interfaces/solidity-executable.provider.mock";

describe('SolidityService', () => {
  let solService: SolidityService;
  let verifiedContracts: VerifiedTestContract[];
  let erroredContracts: ErroredTestContract[];
  let unverifiedContracts: UnverifiedTestContract[];


  beforeAll(async () => {

    const verifiedContractsService = new TestVerifiedContractsFsService();
    verifiedContracts = await verifiedContractsService.getContracts();

    const erroredContractsService = new TestErroredContractsFsService();
    erroredContracts = await erroredContractsService.getContracts();

    const unverifiedContractsService = new TestUnverifiedContractsFsService();
    unverifiedContracts = await unverifiedContractsService.getContracts();

    const downloadService = new DownloadService();
    const releaseProvider = new SolidityReleaseProvider(downloadService);
    const solArchProvider = new SolidityArchProvider();
    const solBuildProvider = new SolidityBuildProvider(releaseProvider);
    const solExecProvider = new SolidityExecutableProviderMock([
      ...verifiedContracts,
      ...erroredContracts,
      ...unverifiedContracts,
    ]);
    solService = new SolidityService(solArchProvider, solBuildProvider, solExecProvider);
  });

  describe('compile', () => {
    it(`should work on verified contracts`, async () => {
      for (const contract of verifiedContracts) {
        const [config, input, expected] = await Promise.all([
          contract.getConfig(),
          contract.getInput(),
          contract.getOutput(),
        ]);
        const compilerName = getCompilerName(config);
        const out = await solService.compile(compilerName, input);
        expect(solidityOutputRemoveAsts(out))
          .toEqual(solidityOutputRemoveAsts(expected));
      }
    });

    it(`should work on unverified contracts`, async () => {
      for (const contract of unverifiedContracts) {
        const [config, input, expected] = await Promise.all([
          contract.getConfig(),
          contract.getInput(),
          contract.getOutput(),
        ]);
        const compilername = getCompilerName(config);
        const out = await solService.compile(compilername, input);
        expect(solidityOutputRemoveAsts(out))
          .toEqual(solidityOutputRemoveAsts(expected));
      }
    });

    it(`should throw ${CompilerNotFoundError.name} error if the compiler does not exist`, async () => {
      const contract = verifiedContracts[0]!;
      const input = await contract.getInput();
      // this compiler doesn't exist
      const compilername: SolidityCompilerName = '0.999.999+commit.aaaaaa';

      let didThrow = false;
      let err: undefined | CompilerNotFoundError;
      await solService
        .compile(compilername, input)
        .catch(_err => {
          didThrow = true;
          err = _err;
        });

      expect(didThrow).toBeTruthy();
      expect(err).toBeInstanceOf(CompilerNotFoundError);
    });

    it(`should throw ${CompilationError.name} if compilation errors`, async () => {
      for (const contract of erroredContracts) {
        const [config, input, expected] = await Promise.all([
          await contract.getConfig(),
          contract.getInput(),
          contract.getOutput(),
        ]);

        const compilername = getCompilerName(config);

        let didThrow = false;
        let err: undefined | CompilationError;
        await solService
          .compile(compilername, input)
          .catch(_err => {
            didThrow = true;
            err = _err;
          });

        expect(didThrow).toBeTruthy();
        expect(err).toBeInstanceOf(CompilationError);
        expect((err as CompilationError)!.output).toEqual(expected);
      }
    });
  });

});