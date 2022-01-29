import Common, { Chain, Hardfork } from "@ethereumjs/common";
import { getOpcodesForHF } from "@ethereumjs/vm/dist/evm/opcodes";
import { toBN } from "web3-utils";
import { getBytecodeWithoutMetadata } from "./utils";

/**
 * check the bytecodes against each other
 *
 * @param  {string} liveByteCode
 * @param  {string} compiedByteCode
 * @return {boolean} true if bytecode matches
 */
export function directVerification(
  liveByteCode: string,
  compiledByteCode: string
): boolean {
  return liveByteCode === compiledByteCode;
}

/**
 * Strips metadata and check the bytecodes against each other
 *
 * @param  {string} liveByteCode
 * @param  {string} compiedByteCode
 * @return {boolean} true if bytecode matches
 */
export function runtimeCodeVerification(
  liveByteCode: string,
  compiledByteCode: string
): boolean {
  liveByteCode = getBytecodeWithoutMetadata(liveByteCode);
  compiledByteCode = getBytecodeWithoutMetadata(compiledByteCode);
  return liveByteCode === compiledByteCode;
}
/**
 * Runs through bytecodes and return opcode array
 *
 * @param  {Buffer} raw
 * @return {OpCodeType[]}
 */
export function getOpCodes(bytecode: Buffer): OpCodeType[] {
  const common = new Common({
    chain: Chain.Mainnet,
    hardfork: Hardfork.London,
  });
  const OPCODES = getOpcodesForHF(common);
  const opcodearr: OpCodeType[] = [];
  let pushData;
  for (let i = 0; i < bytecode.length; i++) {
    const pc = i;
    const curOpCode = OPCODES.get(bytecode[pc])?.name;
    if (curOpCode?.slice(0, 4) === "PUSH") {
      const jumpNum = bytecode[pc] - 0x5f;
      pushData = bytecode.slice(pc + 1, pc + jumpNum + 1);
      i += jumpNum;
    }
    opcodearr.push({ code: curOpCode, data: pushData, byte: bytecode[pc] });
    pushData = "";
  }
  return opcodearr;
}
/**
 * Strips metadata and runtime opcodes, this helps to verify contracts with immutable keyword
 *
 * @param  {string} liveCode
 * @param  {string} compiledCode
 * @return {boolean} true if bytecode matches
 */
export function opCodeCodeVerification(
  liveCode: string,
  compiledCode: string
): boolean {
  const liveByteCode = getBytecodeWithoutMetadata(liveCode);
  const compiledByteCode = getBytecodeWithoutMetadata(compiledCode);
  if (liveByteCode.length !== compiledByteCode.length) return false;
  const liveOpCodes = getOpCodes(Buffer.from(liveByteCode, "hex"));
  const compiledOpCodes = getOpCodes(Buffer.from(compiledByteCode, "hex"));
  if (liveOpCodes.length !== compiledOpCodes.length) return false;
  for (let i = 0; i < liveOpCodes.length; i++) {
    if (liveOpCodes[i].code !== compiledOpCodes[i].code) return false;
    if (
      liveOpCodes[i].code === "PUSH" &&
      liveOpCodes[i].data.toString("hex") !==
        compiledOpCodes[i].data.toString("hex") &&
      !toBN(`0x${compiledOpCodes[i].data.toString("hex")}`).eqn(0)
    )
      return false;
  }
  return true;
}
