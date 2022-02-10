import Web3 from "web3";
import { ChainId } from "../types";
import { IServices } from "../bootstrap";
import { MatchedChains, MatchedContracts } from "../services/contract.service";
import { ContractProcessor } from './contracts.processor';
import { MAX_CONCURRENCY } from "../constants";
import { parallelProcessContracts } from "./contracts.parallel";

export interface ProcessContractsOptions {
  save: boolean;
  failFast: boolean;
  skip: boolean;
  jump?: number;
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
    failFast,
    save,
    skip,
    jump,
  } = options;

  // eslint-disable-next-line no-await-in-loop
  const providerUrl = await services
    .nodeService
    .getUrl({ chainId });
  if (!providerUrl) throw new Error(`unsupported chain "${chainId}"`);
  const web3 = new Web3(providerUrl);

  if (!web3) {
    const msg = `unable to find provider for chainId: ${chainId}`;
    throw new Error(msg);
  }

  const { CONCURRENCY } = process.env;
  const concurrency =  CONCURRENCY ? parseInt(CONCURRENCY, 10) : 1;
  if (concurrency > MAX_CONCURRENCY) {
    throw new Error(`concurrency must be ${MAX_CONCURRENCY}` +
      ` or less (${concurrency})`);
  }
  const processors = Array.from(
    { length: concurrency },
    () => new ContractProcessor(services, { skip }),
  );
  await parallelProcessContracts(
    services,
    { failFast, save, jump },
    Array
      .from(contracts.values())
      .map(contract => ({ address: contract.address, chainId })),
    processors,
  );
}