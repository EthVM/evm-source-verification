export interface Options {
  /**
   * Throws if a hex string contains non-hex characters
   * 
   * Otherwise silently removes them
   * 
   * Note:  Hex buffers automatically silently remove invalid hex chars
   */
  throwInvalidChars?: boolean;

  /**
   * Throws if hex strings contain invalid length
   * 
   * (Hex strings must have an even length)
   * 
   * Otherwise, hex strings are silently trimmed to valid length
   * 
   * Note:  Hex buffers automatically silently trim strings with invalid length
   */
  throwInvalidLength?: boolean;
}

/**
 * Convert a hexable value to a normalised hex string
 *
 * Leads with 0x
 * 
 * Characters are lowercase
 *
 * @param hexInput 
 * @param options 
 * @returns 
 */
export function normalise(hexInput: Hexable, options?: Options): HexString {
  let normalised: string;

  // normalise
  if (Buffer.isBuffer(hexInput)) {
    // buffer automatically replaces non-hex values?
    normalised = hexInput
      .toString('hex')
      .toLowerCase()
      .replace(/^0x/, '');
  } else {
    normalised = hexInput
      .toLowerCase()
      .replace(/^0x/, '');
  }

  if (options?.throwInvalidChars) {
    // must only include valid hex characters
    if (/[^0-9a-f]/.test(normalised)) {
      throw new TypeError(`Cannot convert value to hex. Invalid hex characters:
        + ' ${normalised}`);
    }
  } else {
    // silently remove invalid hex characters
    normalised = normalised.replace(/[^0-9a-f]/g, '');
  }

  // must have even length
  if (normalised.length % 2 !== 0) {
    if (options?.throwInvalidLength) {
      throw new TypeError('Invalid hex input, must have an even number of hex'
        + ` characters: ${normalised}`);
    } else {
      const validLength = normalised.length - normalised.length % 2;
      normalised = normalised.substring(0, validLength);
    }
  }

  normalised = `0x${normalised}`;

  return normalised;
}

/**
 * Convert a hex value to a hex buffer
 *
 * Does NOT lead with 0x
 *
 * @param hexString 
 * @param options 
 * @returns 
 */
export function buf(hexString: Hexable, options?: Options): HexBuffer {
  return Buffer.from(normalise(hexString, options).replace(/^0x/, ''), 'hex');
}
