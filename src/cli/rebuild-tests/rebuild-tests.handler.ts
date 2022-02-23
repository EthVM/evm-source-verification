import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import { delay } from '@nkp/delay';
import { bootstrap } from '../../bootstrap';
import { getMetadata } from '../../libs/metadata';
import { frel } from '../../libs/utils';
import { logger } from '../../logger';
import { ICompilerService } from '../../services/compiler.service';
import { VerificationService } from '../../services/verification.service';
import { TestContract } from '../../models/contract.test.util';
import { TestContractService } from '../../services/contract.service.test.util';

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
        contract.getInputFilename(),
        contract.getConfigFilename(),
      ]);

      const actualDirents = await fs
        .promises
        .readdir(contract.getDirname(), { withFileTypes: true });

      // full absolute filenames
      const actualFilenames = actualDirents
        .map(dirent => path.join(contract.getDirname(), dirent.name));
      
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
  const config = await contract.getConfig();
  const input = await contract.getInput();

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

  log.info(`saving: ${frel(contract.getMetadataFilename())}`)
  await fs.promises.writeFile(
    contract.getMetadataFilename(),
    JSON.stringify(metadata, null, 2),
  );
  await delay(COOLOFF_DELAY);
}