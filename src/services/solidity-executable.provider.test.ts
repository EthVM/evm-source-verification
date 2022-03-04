import assert from 'node:assert';
import { getCompilerName, parseSolidityCompilerName, SolidityPlatform } from "../libs/solidity";
import { TestVerifiedContractsFsService } from "./contracts-fs.service.test.util";
import { SolidityExecutableProvider } from './solidity-executable.provider';
import { VerifiedTestContract } from '../models/contract.verified.test.util';
import { DownloadService } from './download.service';
import { ISolidityReleaseProvider, SolidityReleaseProvider } from './solidity-release.provider';
import { ISolidityArchProvider, SolidityArchProvider } from './solidity-arch.provider';
import { TestCompilerFsService } from "./compiler-fs.service.test.util";
import { ISolidityBuildProvider, SolidityBuildProvider } from "./solidity-build.provider";
import { SolidityBinaryExecutable } from '../compilers/solidity.binary.executable';
import { SolidityWasmExecutable } from '../compilers/solidity.wasm.executable';

describe('SolidityWasmProvider', () => {
  let verifiedContractsService: TestVerifiedContractsFsService;
  let verifiedContracts: VerifiedTestContract[];
  let solBuildProvider: ISolidityBuildProvider;
  let solExecutableProvider: SolidityExecutableProvider;
  let solReleaseProvider: ISolidityReleaseProvider;
  let solArchProvider: ISolidityArchProvider

  beforeAll(async () => {
    const downloadService = new DownloadService();
    const compilerFsService = new TestCompilerFsService(downloadService);
    solExecutableProvider = new SolidityExecutableProvider(compilerFsService);

    solReleaseProvider = new SolidityReleaseProvider(downloadService);
    solArchProvider = new SolidityArchProvider();
    solBuildProvider = new SolidityBuildProvider(solReleaseProvider);

    verifiedContractsService = new TestVerifiedContractsFsService();
    verifiedContracts = await verifiedContractsService.getContracts();
  });

  it('should work with Wasm', async () => {
    for (const contract of verifiedContracts) {
      const config = await contract.getConfig();
      const nameDetail = parseSolidityCompilerName(getCompilerName(config))!;
      const wasmArch = solArchProvider.getWasmArch();
      const build = await solBuildProvider.getWasmBuildInfo(nameDetail, wasmArch);
      assert.ok(build);
      const executable = await solExecutableProvider.getExecutable(build);
      expect(executable).toBeInstanceOf(SolidityWasmExecutable);
    }
  });

  it('should work with LinuxAmd64', async () => {
    for (const contract of verifiedContracts) {
      const config = await contract.getConfig();
      const nameDetail = parseSolidityCompilerName(getCompilerName(config))!;
      const arch = solArchProvider.getPlatformArch(SolidityPlatform.LinuxAmd64);
      const build = await solBuildProvider.getNativeBuildInfo(nameDetail, arch);
      assert.ok(build);
      const executable = await solExecutableProvider.getExecutable(build);
      expect(executable).toBeInstanceOf(SolidityBinaryExecutable);
    }
  });

  it('should work with MacosAmd64', async () => {
    for (const contract of verifiedContracts) {
      const config = await contract.getConfig();
      const nameDetail = parseSolidityCompilerName(getCompilerName(config))!;
      const arch = solArchProvider.getPlatformArch(SolidityPlatform.MacosAmd64);
      const build = await solBuildProvider.getNativeBuildInfo(nameDetail, arch);
      assert.ok(build);
      const executable = await solExecutableProvider.getExecutable(build);
      expect(executable).toBeInstanceOf(SolidityBinaryExecutable);
    }
  });
});