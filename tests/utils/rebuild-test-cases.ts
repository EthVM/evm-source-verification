/**
 * Executabe file
 *
 * Run with `ts-node`
 *
 * @example
 * ```sh
 * npx ts-node tests/utils/rebuild-test-cases.ts
 * ```
 *
 * Deletes build / unknown from testcases and rebuilds them
 */

import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import { delay } from '@nkp/delay';
import { TestContract } from './test-contract';
import { ICompilerService } from '../../src/services/compiler.service';
import { VerificationService } from '../../src/services/verification.service';
import { getMetadata } from '../../src/libs/metadata';
import { bootstrap } from '../../src/bootstrap';
import { frel } from '../../src/libs/utils';
import { TestContractService } from './test-contract-service';
import { logger } from '../../src/logger';

prompt();

const COOLOFF_DELAY = 250;
const DOUBLE_CONFIRMATION_DELAY = 1_000;

const log = logger.child({});

/**
 * Regenerate test cases
 */
async function prompt() {
  log.info('=== test case rebuilder ===');

  log.info('you will be prompted to remove old or unknown files and regenerate new ones');

  const rl = readline.createInterface(process.stdin, process.stdout);

  // get all test cases
  const tcontractService = new TestContractService();
  const tcontracts = await tcontractService.getTestCases();
  const rmFilenames = await getFilesnamesToRemove(tcontracts);

  // print files to remove
  log.info(chalk.bold.red(`${rmFilenames.length} files to remove:`))
  if (rmFilenames.length) log.info(`  ${rmFilenames
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
      process.exit(0);
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
      process.exit(0);
    }

    // start rebuilding
    log.info('rebuilding test cases...');

    // remove build / unknown files
    log.info(`${chalk.red('removing')} ${rmFilenames.length} files:`)
    for (const rmFilename of rmFilenames) {
      log.info(`${chalk.red('removing')}: ${frel(rmFilename)}`);
      await fs.promises.rm(rmFilename);
      await delay(COOLOFF_DELAY);
    }

    const services = await bootstrap();

    const {
      compilerService,
      verificationService,
    } = services;

    // regenerate build files
    log.info('regenerating files');
    let i = 0;
    for (const testCase of tcontracts) {
      i += 1;
      log.info(`=== ${chalk.magenta('rebuilding')}` +
        `  idx=${chalk.green(i)}` +
        `  chainId=${chalk.green(testCase.chainId)}` +
        `  address=${chalk.green(testCase.address)}`);
      await rebuildTestCase(
        compilerService,
        verificationService,
        testCase,
      );
    }

    log.info('done');
    process.exit(0);
  }
}

/**
 * Get the filenames to strip from test cases
 *
 * @param tcontracts
 * @returns
 */
async function getFilesnamesToRemove(tcontracts: TestContract[]): Promise<string[]> {
  // get all files to remove
  const rmFiles: string[] = await Promise
    .all(tcontracts.map(async contract => {
      // remove everything except input and config files
      const keepFilenames = new Set([
        contract.storage.getInputFilename(),
        contract.storage.getConfigFilename(),
      ]);

      const actualDirents = await fs
        .promises
        .readdir(contract.storage.getDirname(), { withFileTypes: true });

      // full absolute filenames
      const actualFilenames = actualDirents
        .map(dirent => path.join(contract.storage.getDirname(), dirent.name));
      
      //
      const unexpectedFilenames = actualFilenames
        .filter(actualFilename => !keepFilenames.has(actualFilename));

      return unexpectedFilenames;
    }))
    .then(removing => removing.flat());

  return rmFiles;
}

/**
 * Regenerate files in test cases
 *
 * @param compilerService
 * @param verificationService
 * @param contract
 */
async function rebuildTestCase(
  compilerService: ICompilerService,
  verificationService: VerificationService,
  contract: TestContract,
): Promise<void> {
  // eslint-disable-next-line no-shadow
  const config = await contract.storage.getConfig();
  const input = await contract.storage.getInput();

  log.info(`compiling` +
    `  name=${chalk.green(config.name)}` +
    `  compiler=${chalk.green(config.compiler)}`);
  const output = await compilerService.compile(config, input)

  const verification = await verificationService.verify(output, config);
  const metadata = getMetadata(verification);

  log.info(`saving: ${frel(contract.getOutputFilename())}`)
  await fs.promises.writeFile(
    contract.getOutputFilename(),
    JSON.stringify(output, null, 2),
  );
  await delay(COOLOFF_DELAY);

  log.info(`saving: ${frel(contract.storage.getMetadataFilename())}`)
  await fs.promises.writeFile(
    contract.storage.getMetadataFilename(),
    JSON.stringify(metadata, null, 2),
  );
  await delay(COOLOFF_DELAY);
}