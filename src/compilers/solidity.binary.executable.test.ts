import assert from "node:assert";
import { getCompilerName, SolidityArchConfigNative, parseSolidityCompilerName } from "../libs/solidity";
import { fexists } from "../libs/utils";
import { VerifiedTestContract } from "../models/contract.verified.test.util";
import { TestCompilerFsService } from "../services/compiler-fs.service.test.util";
import { TestErroredContractsFsService, TestUnverifiedContractsFsService, TestVerifiedContractsFsService } from "../services/contracts-fs.service.test.util";
import { DownloadService } from "../services/download.service";
import { ISolidityArchProvider, SolidityArchProvider } from '../services/solidity-arch.provider';
import { SolidityBinaryExecutable } from "./solidity.binary.executable";
import { UnverifiedTestContract } from "../models/contract.unverified.test.util";
import { ErroredTestContract } from "../models/contract.errored.test.util";
import { ContractLanguage } from "../libs/support";
import { IContractWithOutput } from "../models/contract.test.util";
import { SOLIDITY_BINARY_COMPILE_TIMEOUT } from "../constants";

describe('SolidityBinaryExecutable', () => {
  let compilerFsService: TestCompilerFsService;
  let verifiedContracts: VerifiedTestContract[];
  let unverifiedContracts: UnverifiedTestContract[];
  let erroredContracts: ErroredTestContract[];
  let solArchProvider: ISolidityArchProvider;

  beforeAll(async () => {
    const downloadService = new DownloadService();
    compilerFsService = new TestCompilerFsService(downloadService);

    const verifiedContractService = new TestVerifiedContractsFsService()
    verifiedContracts = await verifiedContractService.getContracts();

    const unverifiedContractService = new TestUnverifiedContractsFsService()
    unverifiedContracts = await unverifiedContractService.getContracts();

    const erroredContractService = new TestErroredContractsFsService()
    erroredContracts = await erroredContractService.getContracts();

    solArchProvider = new SolidityArchProvider();
  });

  describe('should compile contracts on a binary compatible platforms', () => {
    async function testBinaryCompile(
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
      const executable = new SolidityBinaryExecutable(compilerFilename);

      // execute
      const actual = await executable.compile(input);

      expect(actual).toEqual(expected);
    }

    const offset = 0;
    const count = 15;

    it('for verified contracts', async () => {
      const archConfig = solArchProvider.getNativeArch();
      // architecture doesn't support solidity binaries, skip tests
      if (!archConfig) return;
      for (const contract of verifiedContracts.slice(offset, offset + count)) {
        await testBinaryCompile(archConfig, contract);
      }
    }, count * SOLIDITY_BINARY_COMPILE_TIMEOUT);

    it('for unverified contracts', async () => {
      const archConfig = solArchProvider.getNativeArch();
      // architecture doesn't support solidity binaries, skip tests
      if (!archConfig) return;
      for (const contract of unverifiedContracts.slice(offset, offset + count)) {
        await testBinaryCompile(archConfig, contract);
      }
    }, count * SOLIDITY_BINARY_COMPILE_TIMEOUT);

    it('for errored contracts', async () => {
      const archConfig = solArchProvider.getNativeArch();
      // architecture doesn't support solidity binaries, skip tests
      if (!archConfig) return;
      for (const contract of erroredContracts.slice(offset, offset + count)) {
        await testBinaryCompile(archConfig, contract);
      }
    }, count * SOLIDITY_BINARY_COMPILE_TIMEOUT);
  });
});