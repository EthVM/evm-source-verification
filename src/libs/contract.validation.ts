import { toBN } from "web3-utils";
import { ContractConfig, IContractIdentity, CompilerInput } from "../types";

/**
 * Assert that a contract config is valid
 * 
 * @param identity 
 * @param config 
 */
export function validateConfig(identity: IContractIdentity, config: ContractConfig): void {
  // TODO: better validation
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
    throw new Error(`config of chainId=${chainId},` +
      ` address=${address} has no name`);

  if (!caddress)
    throw new Error(`config of chainId=${chainId},` +
      ` address=${address} has no address`);

  if (!cchainId)
    throw new Error(`config of chainId=${chainId},` +
      ` address=${address} has no chainId`);

  if (!ccompiler)
    throw new Error(`config of chainId=${chainId},` +
      ` address=${address} has no compiler`);

  // validate identity

  if (caddress !== address)
    throw new Error(`addresses of chainId=${chainId},` +
      ` address=${address} do not match`);

  if (toBN(cchainId).toNumber() !== chainId)
    throw new Error(`chainIds of of chainId=${chainId},` +
      ` address=${address} do not match`);
}


/**
 * Assert that a contract input is valid
 * 
 * @param identity 
 * @param input 
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateInput(identity: IContractIdentity, input: CompilerInput): void {
  // TODO
}
