// eslint-disable-next-line no-shadow
export enum ContractLanguage {
  Solidity,
  Vyper,
}

/**
 * Is this compiler supported?
 *
 * @param compilername    name of the compiler
 * @returns               whether this compiler is supported
 */
export function isSupported(compilername: string): boolean {
  const language = getLanguage(compilername);
  if (language == null) return false;
  return isLanguageSupported(language);
}

/**
 * Get the string filesystem safe name of a language type
 *
 * @param language    language type
 * @returns           filesystem safe name of the language
 */
export function getLanguageName(language: ContractLanguage): string {
  switch (language) {
    case ContractLanguage.Solidity: return 'solidity';
    case ContractLanguage.Vyper: return 'vyper';
    default: throw new Error(`unknown language "${language}""`);
  }
}

/**
 * Is this language supported
 *
 * @param language    smartcontract language
 * @returns           whether it's supported
 */
export function isLanguageSupported(lang: ContractLanguage): boolean {
  if (lang === ContractLanguage.Solidity) return true;
  return false;
}

/**
 * Get the type of the compiler
 *
 * @param compilername    name of the compiler
 * @returns               type of the compiler
 */
// eslint-disable-next-line class-methods-use-this
export function getLanguage(compilername: string): null | ContractLanguage {
  // TODO: improve this
  const type = compilername.includes('vyper')
    ? ContractLanguage.Vyper
    : ContractLanguage.Solidity;
  return type;
}
