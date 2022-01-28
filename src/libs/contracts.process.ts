import { Result } from "@nkp/result";
import { toPercentage } from '@nkp/percentage';
import Web3 from "web3";
import { compileContract } from "./contracts.compile";
import { MatchedChains, MatchedContracts } from "./contracts.match";
import { saveContract } from "./contracts.save";
import { ChainId, ContractIdentity } from "../types";
import { IServices } from "../bootstrap";

export interface ProcessContractsOptions {
  save: boolean;
  failFast: boolean;
  skip: boolean;
}

/**
 * Compile, validate and optioanlly save metadata for all contracts
 *
 * @param args
 */
export async function processContracts(
  chains: MatchedChains,
  services: IServices,
  options: ProcessContractsOptions,
): Promise<void> {
  // verify the chains
  let i = 0;
  for (const chain of chains.values()) {
    i += 1;
    console.info('processing chain:' +
      `  chainId(${i})=${chain.id}` +
      `  contracts=${chain.contracts.size.toLocaleString('en-US')}`);
    await processChainContracts(
      chain.id,
      chain.contracts,
      services,
      options
    )
  }
}


/**
 * Compile, validate and optioanlly save metadata for a chain's contracts
 *
 * @param args
 */
export async function processChainContracts(
  chainId: ChainId,
  contracts: MatchedContracts,
  services: IServices,
  options: ProcessContractsOptions,
): Promise<void> {
  const {
    contractService,
    verificationService,
    compilerService,
    nodeService,
  } = services;

  const {
    failFast,
    save,
    skip,
  } = options;

  // TODO: process in parallel

  // eslint-disable-next-line no-await-in-loop
  const providerUrl = await nodeService.getUrl({ chainId });
  if (!providerUrl) throw new Error(`unsupported chain "${chainId}"`);
  const web3 = new Web3(providerUrl);

  if (!web3) {
    const msg = `unable to find provider for chainId: ${chainId}`;
    throw new Error(msg);
  }

  let j = 0;
  for (const contract of contracts.values()) {
    j += 1;

    const identity: ContractIdentity = {
      chainId,
      address: contract.address,
    };

    if (skip) {
      // check if metadata already exists
      const hasMetadata = await contractService.hasMetadata(identity);
      if (hasMetadata) {
        console.info('skipping' +
          `  chainid=${chainId}  address=${contract.address}` +
          `  ${j}/${contracts.size}` +
          `  ${toPercentage(j / contracts.size)}`);
        continue;
      }
    }

    console.info('verifying' +
      `  chainid=${chainId}  address=${contract.address}` +
      `  ${j}/${contracts.size}` +
      `  ${toPercentage(j / contracts.size)}`);

    // eslint-disable-next-line no-await-in-loop
    const [config, input] = await Promise.all([
      await contractService.getConfig(identity),
      await contractService.getInput(identity),
    ]);

    const rOut = await compileContract(
      identity,
      config,
      input,
      compilerService,
    );

    if (save) {
      await services
        .stateService
        .addUsedCompiler(identity, config.compiler);
    }

    if (Result.isFail(rOut)) {
      // fail early
      if (failFast) throw rOut.value;
      // log & go to next contract
      console.warn(rOut.value.toString());
      continue;
    }

    const rVerification = await verificationService.verify(
      rOut.value,
      config,
    );

    if (Result.isFail(rVerification)) {
      // fail early
      if (failFast) throw rVerification.value;
      // log & go to next contract
      console.warn(rVerification.value.toString());
      continue;
    }

    const {
      isDirectVerified,
      isOpCodeVerified,
      isRuntimeVerified,
    } = rVerification.value

    if (!isRuntimeVerified && !isOpCodeVerified) {
      // failed
      const msg = `contract is not verified` +
        `  chainid=${chainId}` +
        `  address=${contract.address}` +
        `  isDirectVerified=${isDirectVerified}` +
        `  isRuntimeVerified=${isRuntimeVerified}` +
        `  isOpCodeVerified=${isOpCodeVerified}`
      if (failFast) throw new Error(msg);
      console.warn(msg);
    }

    if (save) {
      await saveContract(
        rVerification.value,
        identity,
        services,
      );
    }
  }
}