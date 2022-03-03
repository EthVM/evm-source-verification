import chalk from 'chalk';
import { performance } from 'node:perf_hooks';
import { eng, hasOwn, toChainId } from "../libs/utils";
import { directVerification, opCodeCodeVerification, runtimeCodeVerification } from "../libs/verifications";
import { logger } from '../logger';
import { CompilerOutputOk, ContractConfig, ContractSourceFile, ContractSourceObject } from "../types";
import { INodeService } from "./node.service";


const log = logger.child({});

/**
 * Output from contract verification
 */
export interface VerifyContractResult {
  isDirectVerified: boolean;
  isRuntimeVerified: boolean;
  isOpCodeVerified: boolean;
  mainSrcFile: ContractSourceFile;
  mainSrcObj: ContractSourceObject;
  liveCode: string;
  compiler: string;
}

/**
 * Configuration options for the VerificationService
 */
export interface VerificationServiceOptions {
  ignoreWarnings?: boolean;
}


/**
 * Provides contract verification between compiled output and code stored
 * on the blockchain
 */
export class VerificationService {
  static readonly DEFAULTS = {
    IGNORE_WARNINGS: false,
  }

  private readonly ignoreWarnings: boolean;

  constructor(
    private readonly nodeService: INodeService,
    options?: VerificationServiceOptions,
  ) {
    this.ignoreWarnings = options?.ignoreWarnings
      ?? VerificationService.DEFAULTS.IGNORE_WARNINGS;
  }


  /**
   * Verify the compiled output against the Web3 node
   *
   * @param output    compiled output
   * @param config    compiler config
   * @returns         verified output if successful
   */
  async verify(
    output: CompilerOutputOk,
    config: ContractConfig,
  ): Promise<VerifyContractResult> {
    const { address, chainId: cChainId, name } = config;

    const chainId = toChainId(cChainId);

    // const web3 = await this.nodeService.getWeb3({ chainId });

    // assert.ok(web3, `unsupported chainId: ${chainId}`);

    // search the solidity compiled json output for the file containing the
    // main contract
    const mainSrcFile = Object
      .values(output.contracts)
      .find(contractSrcFile => hasOwn(contractSrcFile, name));

    if (!mainSrcFile) {
      // contract not found in the output
      const msg = `main contract file not found` +
        `  chainid=${chainId}` +
        `  address=${address}` +
        `  contractName=${name}`
      throw new Error(msg);
    }

    const mainSrcObj = mainSrcFile[name];
    const compiledCode = mainSrcObj.evm.deployedBytecode.object;

    const start = performance.now();
    const liveCode = await this
      .nodeService
      .getCode({ chainId, address })
      .catch(err => {
        const end = performance.now();
        const delta = Math.round(end - start);
        const msg = 'eth_getCode errored' +
          `  took=${delta}ms` +
          `  chainId=${chalk.green(chainId)}` +
          `  address=${chalk.green(address)}` +
          `  err=${err.toString()}`
        log.warn(msg);
        throw err;
      });
    const end = performance.now();
    const delta = Math.round(end - start);

    if (!this.ignoreWarnings && delta > 5_000) {
      // detect slow node...
      const msg = `WARNING eth_getCode took ${chalk.red(eng(delta))}ms` +
        `  chainId=${chalk.green(chainId)}` +
        `  address=${chalk.green(address)}`;
      log.warn(msg);
    }


    if (liveCode === '0x') {
      const msg = `liveCode is "0x". The contract has probably self destructed` +
        `  chainid=${chainId}` +
        `  address=${address}` +
        `  contractName=${name}`;
      throw new Error(msg);
    }

    const isDirectVerified = directVerification(liveCode, compiledCode);
    const isRuntimeVerified = runtimeCodeVerification(liveCode, compiledCode);
    const isOpCodeVerified = opCodeCodeVerification(liveCode, compiledCode);

    const result: VerifyContractResult = {
      compiler: config.compiler,
      isDirectVerified,
      isOpCodeVerified,
      isRuntimeVerified,
      liveCode,
      mainSrcFile,
      mainSrcObj,
    };

    return result;
  }
}