import { CompilerOutput } from "../types";
import { Contract, IContract } from "./contract";

/**
 * Represents a contract that can be used in tests
 *
 * Provides additional methods to support testing
 */
export interface ITestContract extends IContract {
  /**
   * Absolute path of the contract's directory
   *
   * @returns Absolute path of the contract's directory
   */
  getDirname(): string;

  /**
   * Absolute filename of the contract's config file
   *
   * @returns Absolute filename of the contract's config file
   */
  getConfigFilename(): string;

  /**
   * Absolute filename of the contract's input file
   *
   * @returns Absolute filename of the contract's input file
   */
  getInputFilename(): string;

  /**
   * Absolute filename of the contract's metadata file
   *
   * @returns Absolute filename of the contract's metadata file
   */
  getMetadataFilename(): string;
}

/**
 * Represents a contract whose eth_code has been stored
 */
export interface IContractWithEthCode extends ITestContract {
  /**
   * Filename of the contract's eth_code
   *
   * @returns
   */
  getEthCodeFilename(): string;

  /**
   * Get the eth_code of the contract
   *
   * @returns
   */
  getEthCode(): Promise<string>;
}

/**
 * Represents a contract whose output has been stored
 */
export interface IContractWithOutput extends ITestContract {
  /**
   * Absolute filename of the contract's compiled output
   *
   * @returns
   */
  getOutputFilename(): string;

  /**
   * Get the contract's compiled output
   *
   * @returns
   */
  getOutput(): Promise<CompilerOutput>;
}

/**
 * Represents a contract
 */
export abstract class TestContract extends Contract implements ITestContract {
  /**
   * Absolute path of the contract's directory
   * 
   * (exposes Contract's getDirname method publicly)
   *
   * @returns Absolute path of the contract's directory
   */
  public getDirname(): string {
    return super.getDirname();
  }

  /**
   * Absolute filename of the contract's config file
   * 
   * (exposes Contract's getConfigFilename method publicly)
   *
   * @returns Absolute filename of the contract's config file
   */
  public getConfigFilename(): string {
    return super.getConfigFilename();
  }

  /**
   * Absolute filename of the contract's input file
   * 
   * (exposes Contract's getInputFilename method publicly)
   *
   * @returns Absolute filename of the contract's input file
   */
  public getInputFilename(): string {
    return super.getInputFilename();
  }

  /**
   * Absolute filename of the contract's metadata file
   * 
   * (exposes Contract's getMetadataFilename method publicly)
   *
   * @returns Absolute filename of the contract's metadata file
   */
  public getMetadataFilename(): string {
    return super.getMetadataFilename();
  }
}