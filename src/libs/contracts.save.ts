import {
  CborDataType,
  ContractIdentity,
  VerifiedMetadata,
} from "../types";
import * as hash from './hash';
import {
  getBytecodeMetadatas,
  getBytecodeWithoutMetadata,
} from "./utils";
import { VerifyContractResult } from "../services/verification.service";
import { IServices } from "../bootstrap";
import { getMetadata } from "./metadata";

/**
 * Save a compiled and verified contract
 * 
 * @param verification     verification result 
 * @param identity    contract identity
 * @param services    application services 
 * @returns 
 */
export async function saveContract(
  verification: VerifyContractResult,
  identity: ContractIdentity,
  services: IServices,
): Promise<void> {
  // // metadata & hashes
  const { compiler, } = verification;

  const metadata = getMetadata(verification);

  // TODO: add used compiler
  await Promise.all([
    // stopped @ 9851
    services.contractService.saveMetadata(identity, metadata),
    // services.stateService.addUsedCompiler(identity, compiler),
    // services.stateService.addMetalessHash(identity, metadata.metalessHash),
    // services.stateService.addOpcodeHash(identity, metadata.opcodeHash),
    // services.stateService.addRuntimeHash(identity, metadata.runtimeHash),
    // services.stateService.addVerifiedContract(identity),
  ]);
}