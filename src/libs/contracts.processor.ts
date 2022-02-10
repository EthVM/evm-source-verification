import { IServices } from "../bootstrap";
import { VerifyContractResult } from "../services/verification.service";
import { ContractIdentity } from "../types";

export interface IContractProcessor {
  process(identity: ContractIdentity): Promise<ContractResult>;
}

export interface ContractProcessorOptions {
  skip: boolean;
}

export type ContractResult =
  | ContractResult.Skipped
  | ContractResult.Verified
  | ContractResult.Unverified
;

export namespace ContractResult {
  // eslint-disable-next-line no-shadow
  export enum Type { Skipped, Verified, Unverified, }

  export interface Skipped {
    type: ContractResult.Type.Skipped;
    verification: null;
  }

  export interface Verified {
    type: ContractResult.Type.Verified;
    verification: VerifyContractResult;
  }

  export interface Unverified {
    type: ContractResult.Type.Unverified;
    verification: null;
  }

  export function skipped(): ContractResult.Skipped {
    return {
      type: ContractResult.Type.Skipped,
      verification: null,
    };
  }

  export function isSkipped(
    result: ContractResult
  ): result is ContractResult.Skipped {
    return result.type === ContractResult.Type.Skipped;
  }

  export function verified(
    verification: VerifyContractResult
  ): ContractResult.Verified {
    return {
      type: ContractResult.Type.Verified,
      verification,
    };
  }

  export function isVerified(
    result: ContractResult
  ): result is ContractResult.Verified {
    return result.type === ContractResult.Type.Verified;
  }

  export function unverified(): ContractResult.Unverified {
    return {
      type: ContractResult.Type.Unverified,
      verification: null,
    };
  }

  export function isUnverified(
    result: ContractResult
  ): result is ContractResult.Unverified  {
    return result.type === ContractResult.Type.Unverified;
  }
}

export class ContractProcessor implements IContractProcessor {
  constructor(
    private services: IServices,
    private options: ContractProcessorOptions,
  ) {
    //
  }


  async process(identity: ContractIdentity): Promise<ContractResult> {
    const { services, options } = this;
    const { skip, } = options;

    const {
      contractService,
    } = services;

    if (skip) {
      // check if metadata already exists
      const hasMetadata = await contractService.hasMetadata(identity);
      if (hasMetadata) return ContractResult.skipped();
    }

    const [config, input] = await Promise.all([
      await contractService.getConfig(identity),
      await contractService.getInput(identity),
    ]);

    // TODO move this somewhere else (into getConfig??
    services
      .contractService
      .validateConfig(identity, config);

    // TODO move this somewhere else (into getInput??
    services
      .contractService
      .validateInput(identity, input);

    if (!services.compilerService.isSupported(config.compiler)) {
      throw new Error(`unsupported compiler: ${config.compiler}`);
    }

    const out = await services
      .compilerService
      .compile(config, input)

    const verification = await services
      .verificationService
      .verify(out, config)

    const {
      isOpCodeVerified,
      isRuntimeVerified,
    } = verification;

    if (!isRuntimeVerified && !isOpCodeVerified) {
      return ContractResult.unverified();
    }

    return ContractResult.verified(verification);
  }
}