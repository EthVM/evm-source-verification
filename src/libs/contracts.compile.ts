import { Result } from '@nkp/result';
import { CompiledOutput, ContractConfig, ContractIdentity, ContractInput } from '../types';
import { ICompilerService } from '../services/compiler.service';
import { validateContractConfig, validateContractInput } from './contracts.validate';

export interface CompileContractResult {
  compilation: CompiledOutput;
}

/**
 * Compile a contract
 *
 * @param identity  values to locate the contract in the filesystem
 * @param config      contract's config
 * @returns
 */
export async function compileContract(
  identity: ContractIdentity,
  config: ContractConfig,
  input: ContractInput,
  compilerService: ICompilerService,
): Promise<Result<CompiledOutput, Error>> {
  const rconfig = validateContractConfig(identity, config);
  if (Result.isFail(rconfig)) return rconfig;

  const rinput = validateContractInput(identity, input);
  if (Result.isFail(rinput)) return rinput;

  const rout = await compilerService.compile(config, input);

  return rout;
}

