import assert from "node:assert";
import { SOLIDITY_WASM_COMPILE_TIMEOUT } from "../constants";
import { getCompilerName, parseSolidityCompilerName, solidityOutputRemoveAsts, SOLIDITY_WASM_ARCH } from "../libs/solidity";
import { VerifiedTestContract } from "../models/contract.verified.test.util";
import { CompilerFsTestService } from "../services/compiler-fs.service.test.util";
import { VerifiedContractsFsTestService } from "../services/contracts-fs.service.test.util";
import { DownloadService } from "../services/download.service";
import { SolidityWasmExecutable } from "./solidity.wasm.executable";
import { ContractLanguage } from "../libs/support";
import { fexists } from "../libs/utils";

describe('SolidityWasmExecutable', () => {
  let compilerFsService: CompilerFsTestService;
  let verifiedContracts: VerifiedTestContract[];

  beforeAll(async () => {
    const downloadService = new DownloadService();
    compilerFsService = new CompilerFsTestService(downloadService);

    const verifiedContractService = new VerifiedContractsFsTestService()
    verifiedContracts = await verifiedContractService.getContracts();
  });

  {
    const offset = 0;
    const count = 3;
    it('should compile contracts', async () => {
      const archConfig = SOLIDITY_WASM_ARCH;

      for (const contract of verifiedContracts.slice(offset, offset + count)) {
        // get & parse the compiler name
        const [config, input, expected] = await Promise.all([
          contract.getConfig(),
          contract.getInput(),
          contract.getOutput(),
        ]);

        const nameDetail = parseSolidityCompilerName(getCompilerName(config));

        // get compiler filename
        const compilerFilename = compilerFsService.getCompilerFilename({
          language: ContractLanguage.Solidity,
          archConfig,
          longVersion: nameDetail.longVersion,
        });

        assert.ok(
          await fexists(compilerFilename),
          `Compiler "${compilerFilename}" should already be downloaded.` +
          ' if new contracts were added, don\'t forget to run rebuild-tests.');

        // get executable
        const executable = new SolidityWasmExecutable(compilerFilename, nameDetail);

        // execute
        const actual = await executable.compile(input);

        expect(solidityOutputRemoveAsts(actual))
          .toEqual(solidityOutputRemoveAsts(expected));
      }

    }, SOLIDITY_WASM_COMPILE_TIMEOUT * count);
  }
});
