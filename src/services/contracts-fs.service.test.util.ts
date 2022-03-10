/* eslint-disable max-classes-per-file */
import path from "node:path";
import { ICreateContractOptions } from "../models/contract";
import { ErroredTestContract } from "../models/contract.errored.test.util";
import { UnverifiedTestContract } from "../models/contract.unverified.test.util";
import { VerifiedTestContract } from "../models/contract.verified.test.util";
import { BaseContractsFsService } from "./contracts-fs.service.base";

const verifiedPath = (cwd: string) => path.join(
  cwd,
  'tests',
  'contracts',
  'verified',
);

const erroredPath = (cwd: string) => path.join(
  cwd,
  'tests',
  'contracts',
  'errored',
);

const unverifiedPath = (cwd: string) => path.join(
  cwd,
  'tests',
  'contracts',
  'unverified',
);

/**
 * Provides access to verified contract test cases
 */
export class TestVerifiedContractsFsService extends BaseContractsFsService<VerifiedTestContract> {
  constructor() {
    super({ dirname: verifiedPath(process.cwd()) });
  }

  /** @inheritdoc */
  // eslint-disable-next-line class-methods-use-this
  protected createContract(options: ICreateContractOptions): VerifiedTestContract {
    return new VerifiedTestContract(options);
  }
}

/**
 * Provides access to unverified contract test cases
 */
export class TestUnverifiedContractsFsService extends BaseContractsFsService<UnverifiedTestContract> {
  constructor() {
    super({ dirname: unverifiedPath(process.cwd()) });
  }

  /** @inheritdoc */
  // eslint-disable-next-line class-methods-use-this
  protected createContract(options: ICreateContractOptions): UnverifiedTestContract {
    return new UnverifiedTestContract(options);
  }
}

/**
 * Provides access to contracts that error compilation
 */
export class TestErroredContractsFsService extends BaseContractsFsService<ErroredTestContract> {
  constructor() {
    super({ dirname: erroredPath(process.cwd()) });
  }

  /** @inheritdoc */
  // eslint-disable-next-line class-methods-use-this
  protected createContract(options: ICreateContractOptions): ErroredTestContract {
    return new ErroredTestContract(options);
  }
}