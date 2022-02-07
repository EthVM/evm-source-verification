import { Result } from '@nkp/result';
import {
  toBN,
} from './utils';
import { CompiledOutput, ContractConfig, ContractIdentity, ContractInput } from '../types';

export interface CompileContractResult {
  compilation: CompiledOutput;
}

/**
 * Validate a contract config
 *
 * @param identity    identity of the contract
 * @param config      contract config
 * @returns           success if validation succeded, otherwise fail with reason
 */
export function validateContractConfig(
  identity: ContractIdentity,
  config: ContractConfig,
): Result<void, Error> {
  const {
    chainId,
    address,
  } = identity;

  const {
    chainId: cchainId,
    address: caddress,
    compiler: ccompiler,
    name: cname,
  } = config;

  if (!cname)
    return Result.fail(new Error(`config of chainId=${chainId},` +
      ` address=${address} has no name`));

  if (!caddress)
    return Result.fail(new Error(`config of chainId=${chainId},` +
      ` address=${address} has no address`));

  if (!cchainId)
    return Result.fail(new Error(`config of chainId=${chainId},` +
      ` address=${address} has no chainId`));

  if (!ccompiler)
    return Result.fail(new Error(`config of chainId=${chainId},` +
      ` address=${address} has no compiler`));

  // validate identity

  if (caddress !== address)
    return Result.fail(new Error(`addresses of chainId=${chainId},` +
      ` address=${address} do not match`));

  if (toBN(cchainId).toNumber() !== chainId)
    return Result.fail(new Error(`chainIds of of chainId=${chainId},` +
      ` address=${address} do not match`));

  return Result.success(undefined);
}

/**
 * Validate a contract config
 *
 * @param identity    identity of the contract
 * @param input       contract input
 * @returns           success if validation succeded, otherwise fail with reason
 */
export function validateContractInput(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  identity: ContractIdentity,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  input: ContractInput,
): Result<void, Error> {
  // TODO
  return Result.success(undefined);
}