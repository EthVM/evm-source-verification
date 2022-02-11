import { Contract } from "../models/contract";
import { ICompilerService } from "./compiler.service";
import { IVerificationService, VerifyContractResult } from "./verification.service";

/**
 * Provides access to contract compilation and verification
 */
export interface IContractProcessorService {
  /**
   * process a contract and return the result
   *
   * @param contract    contract to process
   * @returns           result of processing
   */
  process(contract: Contract): Promise<null | VerifyContractResult>;
    
}

/**
 * Processes a single contract
 */
export class ContractProcessorService implements IContractProcessorService {
  constructor(
    private compilerService: ICompilerService,
    private verificationService: IVerificationService,
  ) {
    //
  }

  /**
   * @inheritdoc
   */
  async process(contract: Contract): Promise<null | VerifyContractResult> {
    const { compilerService, verificationService } = this;

    const [config, input] = await Promise.all([
      await contract.storage.getConfig(),
      await contract.storage.getInput(),
    ]);

    if (!compilerService.isSupported(config.compiler)) {
      throw new Error(`unsupported compiler: ${config.compiler}`);
    }

    const out = await compilerService.compile(config, input)
    const verification = await verificationService.verify(out, config)

    const {
      isOpCodeVerified,
      isRuntimeVerified,
    } = verification;

    if (!isRuntimeVerified && !isOpCodeVerified) {
      return null;
    }

    return verification;
  }
}