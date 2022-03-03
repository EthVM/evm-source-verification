import assert from "node:assert";
import { getCompilerName, SolidityArchConfigNative, parseSolidityCompilerName, solidityOutputRemoveAsts, SolidityPlatform } from "../libs/solidity";
import { fexists } from "../libs/utils";
import { VerifiedTestContract } from "../models/contract.verified.test.util";
import { CompilerFsTestService } from "../services/compiler-fs.service.test.util";
import { ErroredContractsFsTestService, UnverifiedContractsFsTestService, VerifiedContractsFsTestService } from "../services/contracts-fs.service.test.util";
import { DownloadService } from "../services/download.service";
import { ISolidityArchProvider, SolidityArchProvider } from '../services/solidity-arch.provider';
import { logger } from "../logger";
import { SolidityPosixExecutable } from "./solidity.posix.executable";
import { UnverifiedTestContract } from "../models/contract.unverified.test.util";
import { ErroredTestContract } from "../models/contract.errored.test.util";
import { ContractLanguage } from "../libs/support";
import { IContractWithOutput } from "../models/contract.test.util";
import { SOLIDITY_BINARY_COMPILE_TIMEOUT } from "../constants";

describe('SolidityPosixExecutable', () => {
  let compilerFsService: CompilerFsTestService;
  let verifiedContracts: VerifiedTestContract[];
  let unverifiedContracts: UnverifiedTestContract[];
  let erroredContracts: ErroredTestContract[];
  let solArchProvider: ISolidityArchProvider;

  beforeAll(async () => {
    const downloadService = new DownloadService();
    compilerFsService = new CompilerFsTestService(downloadService);

    const verifiedContractService = new VerifiedContractsFsTestService()
    verifiedContracts = await verifiedContractService.getContracts();

    const unverifiedContractService = new UnverifiedContractsFsTestService()
    unverifiedContracts = await unverifiedContractService.getContracts();

    const erroredContractService = new ErroredContractsFsTestService()
    erroredContracts = await erroredContractService.getContracts();

    solArchProvider = new SolidityArchProvider();
  });

  describe('should compile contracts on Linux', () => {
    function getLinuxArchConfig(): void | SolidityArchConfigNative {
      const archConfig = solArchProvider.getNativeArch();
      if (archConfig?.platform === SolidityPlatform.LinuxAmd64) {
        return archConfig;
      }
      logger.info('skipping linux-only test');
      expect(true).toBeTruthy();
    }

    async function testPosixCompile(
      archConfig: SolidityArchConfigNative,
      contract: IContractWithOutput,
    ) {
        // get & parse the compiler name
      const [config, input, expected] = await Promise.all([
        contract.getConfig(),
        contract.getInput(),
        contract.getOutput(),
      ]);


      const nameDetail = parseSolidityCompilerName(getCompilerName(config));

      const compilerFilename = compilerFsService.getCompilerFilename({
        archConfig,
        language: ContractLanguage.Solidity,
        longVersion: nameDetail.longVersion,
      });

      assert.ok(
        await fexists(compilerFilename),
        `compiler "${compilerFilename}" should already be downloaded`);

      // get executable
      const executable = new SolidityPosixExecutable(compilerFilename);

      // execute
      const actual = await executable.compile(input);

      expect(solidityOutputRemoveAsts(actual))
        .toEqual(solidityOutputRemoveAsts(expected));
    }

    const offset = 0;
    const count = 15;

    it('for verified contracts', async () => {
      const archConfig = getLinuxArchConfig();
      if (!archConfig) return;
      for (const contract of verifiedContracts.slice(offset, offset + count)) {
        await testPosixCompile(archConfig, contract);
      }
    }, count * SOLIDITY_BINARY_COMPILE_TIMEOUT);

    it('for unverified contracts', async () => {
      const archConfig = getLinuxArchConfig();
      if (!archConfig) return;
      for (const contract of unverifiedContracts.slice(offset, offset + count)) {
        await testPosixCompile(archConfig, contract);
      }
    }, count * SOLIDITY_BINARY_COMPILE_TIMEOUT);

    it('for errored contracts', async () => {
      const archConfig = getLinuxArchConfig();
      if (!archConfig) return;
      for (const contract of erroredContracts.slice(offset, offset + count)) {
        await testPosixCompile(archConfig, contract);
      }
    }, count * SOLIDITY_BINARY_COMPILE_TIMEOUT);
  });
});