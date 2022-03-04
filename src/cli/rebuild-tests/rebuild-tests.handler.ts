import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import assert from 'node:assert';
import { delay } from '@nkp/delay';
import { toPercentage } from '@nkp/percentage';
import { getMetadata } from '../../libs/metadata';
import { fexists, frel } from '../../libs/utils';
import { logger } from '../../logger';
import { CompilerService } from '../../services/compiler.service';
import { VerificationService } from '../../services/verification.service';
import { VerifiedTestContract } from '../../models/contract.verified.test.util';
import {
  TestErroredContractsFsService,
  TestUnverifiedContractsFsService,
  TestVerifiedContractsFsService,
} from '../../services/contracts-fs.service.test.util';
import { IContractWithEthCode, IContractWithOutput, ITestContract } from '../../models/contract.test.util';
import { INodeService, NodeService } from '../../services/node.service';
import { ErroredTestContract } from '../../models/contract.errored.test.util';
import { CompilationError } from '../../errors/compilation.error';
import { UnverifiedTestContract } from '../../models/contract.unverified.test.util';
import { CompilerOutput, ContractMetadata } from '../../types';
import { TestCompilerFsService } from '../../services/compiler-fs.service.test.util';
import { DownloadService } from '../../services/download.service';
import { SolidityService } from '../../services/solidity.service';
import { SolidityExecutableProvider } from '../../services/solidity-executable.provider';
import { SolidityArchProvider } from '../../services/solidity-arch.provider';
import { SolidityReleaseProvider } from '../../services/solidity-release.provider';
import { getCompilerName, getSolidityPlatformName, parseSolidityCompilerName, SolidityPlatform } from '../../libs/solidity';
import { ICompilerService } from '../../interfaces/compiler.service.interface';
import { SolidityBuildProvider } from '../../services/solidity-build.provider';

const COOLOFF_DELAY = 250;
const DOUBLE_CONFIRMATION_DELAY = 1_000;

const log = logger.child({});

/**
 * Regenerate test cases
 */
export async function handleRebuildTestsCommand(): Promise<void> {
  log.info('command: rebuild test cases');

  log.info('you will be prompted to remove old or unknown files and regenerate new ones');

  const rl = readline.createInterface(process.stdin, process.stdout);

  // get all test cases
  const verifiedContractService = new TestVerifiedContractsFsService();
  const erroredContractService = new TestErroredContractsFsService();
  const unverifiedContractService = new TestUnverifiedContractsFsService();

  const verifiedContracts = await verifiedContractService.getContracts();
  const erroredContracts = await erroredContractService.getContracts();
  const unverifiedContracts = await unverifiedContractService.getContracts();

  // create services
  const downloadService = new DownloadService();
  // use the compiler test service to download compilres to the test directory
  const compilerFsService = new TestCompilerFsService(downloadService);
  const solArchProvider = new SolidityArchProvider();
  const solReleaseProvider = new SolidityReleaseProvider(downloadService)
  const solBuildProvider = new SolidityBuildProvider(solReleaseProvider);
  const solExecutableProvider = new SolidityExecutableProvider(compilerFsService);
  const solService = new SolidityService(solArchProvider, solBuildProvider, solExecutableProvider)
  const compilerService = new CompilerService(solService);
  const nodeService = new NodeService();
  const verificationService = new VerificationService(nodeService);
  const wasmArch = solArchProvider.getWasmArch();

  const compilersDirname = compilerFsService.getDirname();

  const rmFilenames: string[] = [];

  const allContracts: ITestContract[] = [
    ...verifiedContracts,
    ...erroredContracts,
    ...unverifiedContracts,
  ];
  
  if (await fexists(compilersDirname)) rmFilenames.push(compilersDirname);
  rmFilenames.push(...(await getContractFilenamesToRemove(allContracts)));


  // print files to remove
  log.info(chalk.bold.red(`${rmFilenames.length} files to remove:`))
  if (rmFilenames.length) log.info(`\n  ${rmFilenames
    .map(frel)
    .map(f => chalk.red(f))
    .join('\n  ')}`);

  // ask the developer
  rl.question(
    `Are you sure you want to ${chalk.bold.red('delete')} and rebuild test cases? (y/n): `,
    handleShouldRegenerate,
  );

  // confirm once
  async function handleShouldRegenerate(ans: string): Promise<void> {
    if (ans.toLowerCase() !== 'y') {
      log.info('exiting');
      rl.close();
      return;
    }
    // wait in-case accidental y
    await delay(DOUBLE_CONFIRMATION_DELAY);
    rl.question(
      'Are you REALLY sure? (y/n): ',
      shouldDefinitelyRegenerate,
    );
  }

  // confirm twice
  async function shouldDefinitelyRegenerate(ans: string) {
    if (ans.toLowerCase() !== 'y') {
      log.info('exiting');
      rl.close();
      return;
    }

    rl.close();

    // start rebuilding
    log.info('rebuilding test cases...');

    // remove build / unknown files
    log.info(`removing ${rmFilenames.length} files:`)
    for (const rmFilename of rmFilenames) {
      log.info(`removing: ${frel(rmFilename)}`);
      await fs.promises.rm(rmFilename, { force: true, recursive: true, });
      await delay(COOLOFF_DELAY);
    }

    log.info('regenerating contracts');

    let j = 0;
    let i = 0;
    const il = allContracts.length;
    let jl = allContracts.length;
    for (const contract of allContracts) {
      j += 1;
      log.info(`=== ${chalk.magenta('downloading compilers')}` +
        `  jdx=${chalk.green(j)}` +
        `  chainId=${chalk.green(contract.chainId)}` +
        `  address=${chalk.green(contract.address)}` +
        `  ${j}/${jl}` +
        `  ${toPercentage(j / jl)}`
      );

      const config = await contract.getConfig();
      const nameDetail = parseSolidityCompilerName(getCompilerName(config));

      // download wasm
      const wasmBuild = await solBuildProvider.getWasmBuildInfo(nameDetail, wasmArch);
      assert.ok(wasmBuild);
      log.info(`downloading compiler` +
        `  chainId=${contract.chainId}` +
        `  address=${contract.address}` +
        `  longVersion=${wasmBuild.nameDetail.longVersion}` +
        `  arch=wasm`);
      await solExecutableProvider.getExecutable(wasmBuild);
      await delay(COOLOFF_DELAY);

      // download linuxamd64
      log.info(`downloading compiler` +
        `  chainId=${contract.chainId}` +
        `  address=${contract.address}` +
        `  longVersion=${wasmBuild.nameDetail.longVersion}` +
        `  arch=linuxAmd64`);
      const linuxAmd64Arch = solArchProvider.getPlatformArch(SolidityPlatform.LinuxAmd64);
      const linuxAmd64Build = await solBuildProvider.getNativeBuildInfo(nameDetail, linuxAmd64Arch);
      assert.ok(linuxAmd64Build);
      await solExecutableProvider.getExecutable(linuxAmd64Build);
      await delay(COOLOFF_DELAY);

      // download macosamd64
      log.info(`downloading compiler` +
        `  chainId=${contract.chainId}` +
        `  address=${contract.address}` +
        `  longVersion=${wasmBuild.nameDetail.longVersion}` +
        `  arch=${getSolidityPlatformName(SolidityPlatform.MacosAmd64)}`);
      const macosAmd64Arch = solArchProvider.getPlatformArch(SolidityPlatform.MacosAmd64);
      const macosAmd64Build = await solBuildProvider.getNativeBuildInfo(nameDetail, macosAmd64Arch);
      assert.ok(macosAmd64Build);
      await solExecutableProvider.getExecutable(macosAmd64Build);
      await delay(COOLOFF_DELAY);

      // download windowsamd64
      log.info(`downloading compiler` +
        `  chainId=${contract.chainId}` +
        `  address=${contract.address}` +
        `  longVersion=${wasmBuild.nameDetail.longVersion}` +
        `  arch=${getSolidityPlatformName(SolidityPlatform.WindowsAmd64)}`);
      const windowsAmd64Arch = solArchProvider.getPlatformArch(SolidityPlatform.WindowsAmd64);
      const windowsAmd64Build = await solBuildProvider.getNativeBuildInfo(nameDetail, windowsAmd64Arch);
      assert.ok(windowsAmd64Build);
      await solExecutableProvider.getExecutable(windowsAmd64Build);
      await delay(COOLOFF_DELAY);
    }

    log.info('regenerating contracts');

    i = 0;
    j = 0;
    jl = verifiedContracts.length
    for (const verifiedContract of verifiedContracts) {
      i += 1;
      j += 1;
      log.info(`=== ${chalk.magenta('rebuilding verified')}` +
        `  idx=${chalk.green(i)}` +
        `  jdx=${chalk.green(j)}` +
        `  chainId=${chalk.green(verifiedContract.chainId)}` +
        `  address=${chalk.green(verifiedContract.address)}` +
        `  ${j}/${jl}  ${toPercentage(j / jl)}` +
        `  |  ${i}/${il}  ${toPercentage(i / il)}`
      );
      await rebuildVerifiedContract(
        compilerService,
        verificationService,
        nodeService,
        verifiedContract,
      );
    }

    j = 0;
    jl = erroredContracts.length
    for (const erroredContract of erroredContracts) {
      i += 1;
      j += 1;
      log.info(`=== ${chalk.magenta('rebuilding errored')}` +
        `  idx=${chalk.green(i)}` +
        `  jdx=${chalk.green(j)}` +
        `  chainId=${chalk.green(erroredContract.chainId)}` +
        `  address=${chalk.green(erroredContract.address)}` +
        `  ${j}/${jl}  ${toPercentage(j / jl)}` +
        `  |  ${i}/${il}  ${toPercentage(i / il)}`
      );
      await rebuildErroredContract(
        compilerService,
        erroredContract,
      );
    }

    j = 0;
    jl = unverifiedContracts.length
    for (const unverifiedContract of unverifiedContracts) {
      i += 1;
      j += 1;
      log.info(`=== ${chalk.magenta('rebuilding unverified')}` +
        `  idx=${chalk.green(i)}` +
        `  jdx=${chalk.green(j)}` +
        `  chainId=${chalk.green(unverifiedContract.chainId)}` +
        `  address=${chalk.green(unverifiedContract.address)}` +
        `  ${j}/${jl}  ${toPercentage(j / jl)}` +
        `  |  ${i}/${il}  ${toPercentage(i / il)}`
      );
      await rebuildUnverifiedContract(
        compilerService,
        verificationService,
        nodeService,
        unverifiedContract,
      );
    }

    log.info('done');
  }
}

/**
 * Get the filenames to strip from test cases
 *
 * @param contracts
 * @returns
 */
async function getContractFilenamesToRemove(contracts: ITestContract[]): Promise<string[]> {
  // get all files to remove
  const rmFiles: string[] = await Promise
    .all(contracts.map(async contract => {
      // remove everything except input and config files
      const keepFilenames = new Set([
        contract.getInputFilename(),
        contract.getConfigFilename(),
      ]);

      const actualDirents = await fs
        .promises
        .readdir(contract.getDirname(), { withFileTypes: true });

      // full absolute filenames
      const actualFilenames = actualDirents
        .map(dirent => path.join(contract.getDirname(), dirent.name));
      
      const unexpectedFilenames = actualFilenames
        .filter(actualFilename => !keepFilenames.has(actualFilename));

      return unexpectedFilenames;
    }))
    .then(removing => removing.flat());

  return rmFiles;
}

/**
 * Regenerate verified test contracts
 *
 * @param compilerService
 * @param verificationService
 * @param nodeService
 * @param contract
 */
async function rebuildVerifiedContract(
  compilerService: ICompilerService,
  verificationService: VerificationService,
  nodeService: INodeService,
  contract: VerifiedTestContract,
): Promise<void> {
  // eslint-disable-next-line no-shadow
  const [
    config,
    input,
    ethCode,
  ] = await Promise.all([
    contract.getConfig(),
    contract.getInput(),
    nodeService.getCode(contract)
  ]);

  log.info(`compiling` +
    `  name=${chalk.green(config.name)}` +
    `  compiler=${chalk.green(config.compiler)}`);
  const output = await compilerService.compile(config, input)

  const verification = await verificationService.verify(output, config);
  const metadata = getMetadata(verification);

  await saveEthCode(contract, ethCode);
  await saveOutput(contract, output);
  await saveMetadata(contract, metadata);
}

/**
 * Regenerate unverified test contracts
 *
 * @param compilerService
 * @param verificationService
 * @param nodeService
 * @param contract
 */
async function rebuildUnverifiedContract(
  compilerService: ICompilerService,
  verificationService: VerificationService,
  nodeService: INodeService,
  contract: UnverifiedTestContract,
): Promise<void> {
  // eslint-disable-next-line no-shadow
  const [
    config,
    input,
    ethCode,
  ] = await Promise.all([
    contract.getConfig(),
    contract.getInput(),
    nodeService.getCode(contract),
  ]);

  log.info(`compiling` +
    `  name=${chalk.green(config.name)}` +
    `  compiler=${chalk.green(config.compiler)}`);
  const output = await compilerService.compile(config, input)

  const verification = await verificationService.verify(output, config);
  const metadata = getMetadata(verification);

  await saveEthCode(contract, ethCode);
  await saveOutput(contract, output);
  await saveMetadata(contract, metadata);
}

/**
 * Regenerate errored test contracts
 *
 * @param compilerService
 * @param contract
 */
async function rebuildErroredContract(
  compilerService: ICompilerService,
  contract: ErroredTestContract,
): Promise<void> {
  // eslint-disable-next-line no-shadow
  const [
    config,
    input,
  ] = await Promise.all([
    contract.getConfig(),
    contract.getInput(),
  ]);

  log.info(`compiling` +
    `  name=${chalk.green(config.name)}` +
    `  compiler=${chalk.green(config.compiler)}`);

  let err: undefined | CompilationError;
  await compilerService
    .compile(config, input)
    .catch(_err => { err = _err });

  // assert compilation produced an error
  assert.ok(
    err && err instanceof CompilationError,
    `failed to reproduce errored contract: ${err}`
  );
  
  // assert the error contains the failed output
  assert.ok(err?.output, `error does not contain output`);

  await saveOutput(contract, err.output);
}

/**
 * Save the ethCode of a test contract
 * 
 * @param contract    test contract
 * @param ethCode     ethCode to save
 */
async function saveEthCode(contract: IContractWithEthCode, ethCode: string): Promise<void> {
  log.info(`saving: ${frel(contract.getEthCodeFilename())}`)
  await fs.promises.writeFile(
    contract.getEthCodeFilename(),
    ethCode,
  );
  await delay(COOLOFF_DELAY);

}

/**
 * Save the output of a test contract
 * 
 * @param contract    test contract
 * @param output      output to save
 */
async function saveOutput(contract: IContractWithOutput, output: CompilerOutput) {
  log.info(`saving: ${frel(contract.getOutputFilename())}`)
  await fs.promises.writeFile(
    contract.getOutputFilename(),
    JSON.stringify(output, null, 2),
  );
  await delay(COOLOFF_DELAY);
}

/**
 * Save the metadata of a test contract
 * 
 * @param contract    test contract
 * @param metadata    metadata to save
 */
async function saveMetadata(contract: ITestContract, metadata: ContractMetadata) {
  log.info(`saving: ${frel(contract.getMetadataFilename())}`)
  await fs.promises.writeFile(
    contract.getMetadataFilename(),
    JSON.stringify(metadata, null, 2),
  );
  await delay(COOLOFF_DELAY);
}