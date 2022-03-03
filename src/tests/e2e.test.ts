import { SOLIDITY_WASM_COMPILE_TIMEOUT } from "../constants";
import { IProcesorService, ProcessorStats } from "../interfaces/processor.service.interface";
import { ErroredTestContract } from "../models/contract.errored.test.util";
import { UnverifiedTestContract } from "../models/contract.unverified.test.util";
import { VerifiedTestContract } from "../models/contract.verified.test.util";
import { CompilerFsTestService } from "../services/compiler-fs.service.test.util";
import { CompilerService } from "../services/compiler.service";
import {
  VerifiedContractsFsTestService,
  ErroredContractsFsTestService,
  UnverifiedContractsFsTestService,
} from "../services/contracts-fs.service.test.util";
import { DownloadService } from "../services/download.service";
import { NodeService } from "../services/node.service";
import { ProcessorService } from "../services/processor.service";
import { SolidityArchProvider } from "../services/solidity-arch.provider";
import { SolidityBuildProvider } from "../services/solidity-build.provider";
import { SolidityExecutableProvider } from "../services/solidity-executable.provider";
import { SolidityReleaseProvider } from "../services/solidity-release.provider";
import { SolidityService } from "../services/solidity.service";
import { VerificationService } from "../services/verification.service";

describe('e2e', () => {
  let processorService: IProcesorService;

  let verifiedContractsService: VerifiedContractsFsTestService;
  let verifiedContracts: VerifiedTestContract[];

  let erroredContractsService: ErroredContractsFsTestService;
  let erroredContracts: ErroredTestContract[];

  let unverifiedContractsService: UnverifiedContractsFsTestService;
  let unverifiedContracts: UnverifiedTestContract[];


  beforeAll(async () => {
    verifiedContractsService = new VerifiedContractsFsTestService();
    verifiedContracts = await verifiedContractsService.getContracts();

    erroredContractsService = new ErroredContractsFsTestService();
    erroredContracts = await erroredContractsService.getContracts();

    unverifiedContractsService = new UnverifiedContractsFsTestService();
    unverifiedContracts = await unverifiedContractsService.getContracts();

    const downloadService = new DownloadService();
    const releaseProvider = new SolidityReleaseProvider(downloadService);
    const compilerFsService = new CompilerFsTestService(downloadService);
    const solArchProvider = new SolidityArchProvider();
    const solBuildProvider = new SolidityBuildProvider(releaseProvider);
    const solExecProvider = new SolidityExecutableProvider(compilerFsService);
    const solService = new SolidityService(solArchProvider, solBuildProvider, solExecProvider);
    const compilerService = new CompilerService(solService);
    const nodeService = new NodeService();
    const verificationService = new VerificationService(nodeService);
    processorService = new ProcessorService(compilerService, verificationService)
  });

  describe('verification', () => {
    const offset = 0;
    const count = 10;
    it(`should process ${count} verified contracts`, async () => {
      const contracts = verifiedContracts.slice(offset, count + offset);
      const actual = await processorService.process(contracts, { concurrency: 1 });
      const expected: ProcessorStats = {
        ok: {
          jumped: [],
          skipped: [],
          verified: contracts,
        },
        err: {
          errored: [],
          failed: [],
          noCompiler: [],
          unsupported: [],
          unverified: [],
        },
      };
      expect(actual).toEqual(expected);
    }, count * SOLIDITY_WASM_COMPILE_TIMEOUT);

    it(`should process ${count} unverified contracts`, async () => {
      const contracts = unverifiedContracts.slice(offset, count + offset);
      const actual = await processorService.process(contracts, { concurrency: 1 });
      const expected: ProcessorStats = {
        ok: {
          jumped: [],
          skipped: [],
          verified: [],
        },
        err: {
          errored: [],
          failed: [],
          noCompiler: [],
          unsupported: [],
          unverified: contracts,
        },
      };
      expect(actual).toEqual(expected);
    }, count * SOLIDITY_WASM_COMPILE_TIMEOUT);

    it(`should process ${count} err contracts`, async () => {
      const contracts = erroredContracts.slice(offset, count + offset);
      const actual = await processorService.process(contracts, { concurrency: 1 });
      const expected: ProcessorStats = {
        ok: {
          jumped: [],
          skipped: [],
          verified: [],
        },
        err: {
          errored: [],
          failed: contracts,
          noCompiler: [],
          unsupported: [],
          unverified: [],
        },
      };
      expect(actual).toEqual(expected);
    }, count * SOLIDITY_WASM_COMPILE_TIMEOUT);
  });
})