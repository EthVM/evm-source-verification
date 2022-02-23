// eslint-disable-next-line no-shadow
export enum CompilerType {
  Solidity,
  Vyper,
  Unknown,
}

/**
 * Is this compiler supported?
 *
 * @param compilername    name of the compiler
 * @returns               whether this compiler is supported
 */
export function isSupported(compilername: string): boolean {
  const type = getCompilerType(compilername);
  if (type === CompilerType.Solidity) return true;
  return false;
}

/**
 * Get the type of the compiler
 *
 * @param compilername    name of the compiler
 * @returns               type of the compiler
 */
// eslint-disable-next-line class-methods-use-this
export function getCompilerType(compilername: string): CompilerType {
  // TODO: improve this
  const type = compilername.includes('vyper')
    ? CompilerType.Vyper
    : CompilerType.Solidity;
  return type;
}
