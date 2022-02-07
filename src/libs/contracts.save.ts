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
  // metadata & hashes
  const { mainSrcObj, liveCode } = verification;
  const { abi } = mainSrcObj;

  const metalessBytecode = getBytecodeWithoutMetadata(liveCode);
  const opcodeHash = hash.opcode.fromMetadatalessBytecode(metalessBytecode);
  const metalessHash = hash.metaless.fromMetadatalessBytecode(metalessBytecode);
  const runtimeHash = hash.runtime.fromRuntimeBytecode(liveCode);

  // keep only unique encoded metadata
  // TODO: it seems every call to `getBytecodeMetadatas` produces duplicate
  // metadata elements, can this be resoled in `getBytecodeMetadatas`?
  const encodedMetadata: CborDataType[] = getBytecodeMetadatas(liveCode);

  const uniqueEncodedMetadata: CborDataType[] = Array
    .from(new Set(encodedMetadata.map((v) => JSON.stringify(v))))
    .map(v => JSON.parse(v));

  const metadata: VerifiedMetadata = {
    opcodeHash,
    metalessHash,
    runtimeHash,
    encodedMetadata: uniqueEncodedMetadata,
    abi,
    deployedBytecode: {
      object: mainSrcObj.evm.deployedBytecode.object,
    },
    bytecode: {
      object: mainSrcObj.evm.bytecode.object,
    },
  };

  console.info('saving verification results' +
    `  chainId=${identity.chainId}` +
    `  address=${identity.address}`);

  await Promise.all([
    services.contractService.saveMetadata(identity, metadata),
    services.stateService.addMetalessHash(identity, metalessHash),
    services.stateService.addOpcodeHash(identity, opcodeHash),
    services.stateService.addRuntimeHash(identity, runtimeHash),
    services.stateService.addVerifiedContract(identity),
  ]);
}