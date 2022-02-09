import { performance } from 'perf_hooks';
import { Result } from "@nkp/result";
import { toPercentage } from '@nkp/percentage';
import Web3 from "web3";
import { saveContract } from "./contracts.save";
import { ChainId, CompiledOutput, ContractConfig, ContractIdentity, ContractInput } from "../types";
import { IServices } from "../bootstrap";
import { MatchedChains, MatchedContracts } from "../services/contract.service";
import { ymdhms } from './utils';

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

    const start = performance.now();

    // eslint-disable-next-line no-await-in-loop
    let config: ContractConfig;
    let input: ContractInput;
    try {
      ([config, input] = await Promise.all([
        await contractService.getConfig(identity),
        await contractService.getInput(identity),
      ]));
    } catch (err) {
      // failed to get config or input
      const date = ymdhms()
      const msg = `[${date}] (${j})` +
        ` ${identity.chainId}` +
        ` ${identity.address}` +
        ` errored: ${(err as Error).toString()}`;
      await services.stateService.addLog(identity, 'error', msg);
      if (failFast) throw err;
      else console.warn(msg);
      continue;
    }

    const vInput = services
      .contractService
      .validateInput(identity, input);

    if (Result.isFail(vInput)) {
      // failed to get input
      const date = ymdhms()
      const msg = `[${date}] (${j})` +
        ` ${identity.chainId}` +
        ` ${identity.address}` +
        ` input validation failed: ${vInput.value.toString()}`;
      await services.stateService.addLog(identity, 'error', msg);
      if (failFast) throw vInput.value;
      else console.warn(msg);
      continue;
    }

    const vConfig = services
      .contractService
      .validateConfig(identity, config);

    if (Result.isFail(vConfig)) {
      // failed to get config
      const date = ymdhms()
      const msg = `[${date}] (${j})` +
        ` ${identity.chainId}` +
        ` ${identity.address}` +
        ` config validation failed: ${vConfig.value.toString()}`;
      await services.stateService.addLog(identity, 'error', msg);
      if (failFast) throw vConfig.value;
      else console.warn(msg);
      continue;
    }

    const rOut = await services
      .compilerService
      .compile(config, input)
      .catch((err: Error) => Result.fail(err));

    if (save) {
      await services
        .stateService
        .addUsedCompiler(identity, config.compiler);
    }

    if (Result.isFail(rOut)) {
      // failed to compile
      const date = ymdhms()
      const msg = `[${date}] (${j})` +
        ` ${identity.chainId}` +
        ` ${identity.address}` +
        ` compilation failed: ${(rOut.value as Error).toString()}`;
      await services.stateService.addLog(identity, 'error', msg);
      if (failFast) throw rOut.value;
      else console.warn(msg);
      continue;
    }

    const rVer = await verificationService
      .verify(rOut.value, config)
      .catch((err: Error) => Result.fail(err));

    if (Result.isFail(rVer)) {
      // failed to verify
      const date = ymdhms()
      const msg = `[${date}] (${j})` +
        ` ${identity.chainId}` +
        ` ${identity.address}` +
        ` verification failed: ${(rVer.value as Error).toString()}`;
      await services.stateService.addLog(identity, 'error', msg);
      if (failFast) throw rVer.value;
      else console.warn(msg);
      continue;
    }

    const {
      isDirectVerified,
      isOpCodeVerified,
      isRuntimeVerified,
    } = rVer.value

    if (!isRuntimeVerified && !isOpCodeVerified) {
      // - is not verified -
      const date = ymdhms()
      const msg = `[${date}] (${j})` +
        ` ${identity.chainId}` +
        ` ${identity.address}` +
        ` contract is not verified` +
        `  chainid=${chainId}` +
        `  address=${contract.address}` +
        `  isDirectVerified=${isDirectVerified}` +
        `  isRuntimeVerified=${isRuntimeVerified}` +
        `  isOpCodeVerified=${isOpCodeVerified}`
      await services.stateService.addLog(identity, 'error', msg);
      if (failFast) throw new Error(msg);
      else console.warn(msg);
      continue;
    }

    if (save) {
      await saveContract(
        rVer.value,
        identity,
        services,
      );
    }
  }
}