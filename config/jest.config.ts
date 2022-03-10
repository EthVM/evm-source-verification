// eslint-disable-next-line import/no-extraneous-dependencies
import { InitialOptionsTsJest } from 'ts-jest/dist/types';

/**
 * TypeScript will be compiled to JavaScript for testing
 *
 * This makes tests run in an environment close to production.
 * It lets us, for example, execute other source files as plain
 * JavaScript, like we are able to in production, but if using
 * ts-jest we could not since we only have TypeSCript files
 * 
 * Build files output is in dist/
 * Test files output is in dist.tests/
 */
const config: InitialOptionsTsJest = {
  // give tests 300 seconds
  // tests can run long if the computer is slow or has to use wasm
  testTimeout: 300_1000,
  rootDir: "../dist.tests",
  testEnvironment: "node",
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
};

export default config;