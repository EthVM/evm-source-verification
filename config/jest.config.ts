// eslint-disable-next-line import/no-extraneous-dependencies
import { InitialOptionsTsJest } from 'ts-jest/dist/types';

const config: InitialOptionsTsJest = {
  preset: "ts-jest",
  rootDir: "../",
  testEnvironment: "node",
  // testPathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/contracts', '<rootDir>/compilers'],
  testPathIgnorePatterns: ['<rootDir>/dist',],
  watchPathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/contracts', '<rootDir>/compilers'],
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