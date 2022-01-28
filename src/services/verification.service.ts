import { Result } from "@nkp/result";
import { hasOwn, toBN } from "../libs/utils";
import { directVerification, opCodeCodeVerification, runtimeCodeVerification } from "../libs/verifications";
import { CompiledOutput, ContractConfig, ContractSourceFile, ContractSourceObject } from "../types";
import { INodeService } from "./node.service";


/**
 * Provides contract verification between compiled output and code stored
 * on the blockchain
 */
export interface IVerificationService {
  /**
   * Verify the compiled output against the Web3 node
   *
   * @param output    compiled output
   * @param config    compiler config
   * @returns         verified output if successful
   */
  verify(
    output: CompiledOutput,
    config: ContractConfig,
  ): Promise<Result<VerifyContractResult, Error>>;
}


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
}


export class VerificationService implements IVerificationService {
  constructor(private readonly nodeService: INodeService) {
    //
  }


  /**
   * Verify the compiled output against the Web3 node
   *
   * @param output    compiled output
   * @param config    compiler config
   * @returns         verified output if successful
   */
  async verify(
    output: CompiledOutput,
    config: ContractConfig,
  ): Promise<Result<VerifyContractResult, Error>> {
    const { address, chainId: cChainId, name } = config;

    const chainId = toBN(cChainId).toNumber();

    const web3 = await this.nodeService.getWeb3({ chainId });

    if (!web3) return Result.fail(new Error(`unsupported chainId: ${chainId}`))

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
      return Result.fail(new Error(msg));
    }

    const mainSrcObj = mainSrcFile[name];
    const compiledCode = mainSrcObj.evm.deployedBytecode.object;

    // TODO: handle liveCode = 0x (contract has already self destructed)
    const liveCode = await web3.eth.getCode(address);

    if (liveCode === '0x') {
      const msg = `liveCode is "0x". The contract has probably self destructed` +
        `  chainid=${chainId}` +
        `  address=${address}` +
        `  contractName=${name}`;
      return Result.fail(new Error(msg));
    }

    const isDirectVerified = directVerification(liveCode, compiledCode);
    const isRuntimeVerified = runtimeCodeVerification(liveCode, compiledCode);
    const isOpCodeVerified = opCodeCodeVerification(liveCode, compiledCode);

    const result: VerifyContractResult = {
      isDirectVerified,
      isOpCodeVerified,
      isRuntimeVerified,
      liveCode,
      mainSrcFile,
      mainSrcObj,
    };

    return Result.success(result);
  }
}