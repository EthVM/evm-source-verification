// eslint-disable-next-line import/no-extraneous-dependencies
import { InitialOptionsTsJest } from 'ts-jest/dist/types';

const config: InitialOptionsTsJest = {
  preset: "ts-jest",
  rootDir: "../",
  testEnvironment: "node",
  testPathIgnorePatterns: ['./dist'],
  // moduleNameMapper: {
  //   "^@src/(.*)$": "<rootDir>/src/$1",
  // },
  setupFiles: ['<rootDir>/config/jest.setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
};

export default config;