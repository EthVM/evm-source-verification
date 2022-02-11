import { VerifyContractResult } from "../services/verification.service";
import { CborDataType, ContractMetadata } from "../types";
import * as hash from './hash';
import { getBytecodeMetadatas, getBytecodeWithoutMetadata } from "./utils";


/**
 * Generate Contract Metadata
 *
 * @param verification    verification result
 * @returns               metadata
 */
export function getMetadata(verification: VerifyContractResult): ContractMetadata {
  // metadata & hashes
  const { mainSrcObj, liveCode, compiler } = verification;
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

  const metadata: ContractMetadata = {
    compiler,
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

  return metadata;
}