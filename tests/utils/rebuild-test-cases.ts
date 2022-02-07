/**
 * Executabe file
 *
 * Run with `ts-node`
 *
 * @example
 * ```
 * sh
 * npx ts-node tests/utils/rebuild-test-cases.ts
 * ```
 *
 * Deletes build / unknown from testcases and rebuilds them
 */

import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';
import { delay } from '@nkp/delay';
import { Result } from '@nkp/result';
import { TestCase } from './test-case';
import { ICompilerService } from '../../src/services/compiler.service';
import { IVerificationService } from '../../src/services/verification.service';
import { getMetadata } from '../../src/libs/metadata';
import { bootstrap } from '../../src/bootstrap';
import { frel } from '../../src/libs/utils';
import { getTestCases } from './get-test-cases';

prompt();

const COOLOFF_DELAY = 250;
const DOUBLE_CONFIRMATION_DELAY = 1_000;

/**
 * Regenerate test cases
 */
async function prompt() {
  console.log('=== test case rebuilder ===');

  console.log('you will be prompted to remove old or unknown files and regenerate new ones');

  const rl = readline.createInterface(process.stdin, process.stdout);

  // get all test cases
  const testCases = await getTestCases();

  const rmFilenames = await getFilesnamesToRemove(testCases);

  // print files to remove
  console.log(`${rmFilenames.length} files to remove:`)
  if (rmFilenames.length) console.log(`  ${rmFilenames.join('\n  ')}`);

  // ask the developer
  rl.question(
    'Are you sure you want to remove and rebuild test cases? (y/n): ',
    handleShouldRegenerate,
  );

  // confirm once
  async function handleShouldRegenerate(ans: string): Promise<void> {
    if (ans.toLowerCase() !== 'y') {
      console.log('exiting');
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
      console.log('exiting');
      process.exit(0);
    }

    // start rebuilding
    console.log('rebuilding test cases...');

    // remove build / unknown files
    console.log(`removing ${rmFilenames.length} files:`)
    for (const rmFilename of rmFilenames) {
      console.log(`removing: ${frel(rmFilename)}`);
      await fs.promises.rm(rmFilename);
      await delay(COOLOFF_DELAY);
    }

    const services = await bootstrap();

    const {
      compilerService,
      verificationService,
    } = services;

    // regenerate build files
    console.log('regenerating files');
    let i = 0;
    for (const testCase of testCases) {
      i += 1;
      console.log('=== rebuidling' +
        `  idx=${i}` +
        `  chainId="${testCase.chainId}"` +
        `  address="${testCase.address}"`);
      await rebuildTestCase(
        compilerService,
        verificationService,
        testCase,
      );
      await delay(COOLOFF_DELAY);
    }

    console.log('done');
    process.exit(0);
  }
}

/**
 * Get the filenames to strip from test cases
 *
 * @param testCases
 * @returns
 */
async function getFilesnamesToRemove(testCases: TestCase[]): Promise<string[]> {
  // get all files to remove
  const rmFiles: string[] = await Promise
    .all(testCases.map(async testCase => {
      // remove everything except input and config files
      const keepFilenames = new Set([
        testCase.getInputFilename(),
        testCase.getConfigFilename(),
      ]);

      const actualDirents = await fs
        .promises
        .readdir(testCase.dirname, { withFileTypes: true });

      // full absolute filenames
      const actualFilenames = actualDirents
        .map(dirent => path.join(testCase.dirname, dirent.name));
      
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
 * @param testCase
 */
async function rebuildTestCase(
  compilerService: ICompilerService,
  verificationService: IVerificationService,
  testCase: TestCase,
): Promise<void> {
  // eslint-disable-next-line no-shadow
  const config = await testCase.getConfig();
  const input = await testCase.getInput();

  console.log(`compiling` +
    `  name="${config.name}"` +
    `  compiler="${config.compiler}"`);
  const output = await compilerService.compile(config, input)
  if (Result.isFail(output)) throw output.value;

  const verification = await verificationService.verify(output.value, config);
  if (Result.isFail(verification)) throw verification.value;
  const metadata = getMetadata(verification.value);

  console.log(`saving: "${frel(testCase.getOutputFilename())}"`)
  await fs.promises.writeFile(
    testCase.getOutputFilename(),
    JSON.stringify(output.value, null, 2),
  );

  console.log(`saving: "${frel(testCase.getMetadataFilename())}"`)
  await fs.promises.writeFile(
    testCase.getMetadataFilename(),
    JSON.stringify(metadata, null, 2),
  );
}