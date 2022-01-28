import fs from 'node:fs';
import path from 'node:path';
import { toBN } from '../../src/libs/utils';
import { TestCase } from './test-case';

const testCasesDirname = path.join(
  process.cwd(),
  'tests',
  'cases',
  );

/**
 * Get all test cases from the filesystem
 * 
 * @returns 
 */
export async function getTestCases(): Promise<TestCase[]> {
  const testCases = await fs
    .promises
    // get all chains
    .readdir(testCasesDirname, { withFileTypes: true })
    .then(async (chainDirs): Promise<TestCase[]> => {
      // all chains
      const chainsAddresses = await Promise.all(chainDirs.map(async (chainDir): Promise<TestCase[]> => {
        // get all addresses for the chain
        const chainId = toBN(chainDir.name).toNumber();
        const chainDirname = path.join(testCasesDirname, chainDir.name);
        const files = await fs.promises.readdir(chainDirname, { withFileTypes: true });
        return files.map((file): TestCase => {
          // all addresses
          const address = file.name;
          const dirname = path.join(chainDirname, file.name);
          return new TestCase({ address, chainId,}, dirname);
        });
      }));

      // flatten
      const cases: TestCase[] = chainsAddresses.flat();
      return cases;
    });

  return testCases;
}