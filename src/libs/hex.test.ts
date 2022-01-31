import * as hex from './hex';

describe('hex', () => {
  describe('normalise', () => {
    it('should not change a valid hex string', () => {
      const str = '0x123abcdeff';
      expect(hex.normalise(str)).toBe(str);
    });

    it('should start with 0x', () => {
      const str = '123abcdeff';
      expect(hex.normalise(str)).toBe(`0x${str}`);
    });

    it('should silently remove capitalisation', () => {
      const str = '0x123ABCDEFF';
      expect(hex.normalise(str)).toBe(str.toLowerCase());
    });

    it('should silently remove invalid characters', () => {
      const str = '123abcdegj';
      expect(hex.normalise(str)).toBe(`0x${str.replace(/[^0-9a-f]/g, '')}`);
    });

    it('should silently trim invalid lengths', () => {
      const valid = '0x123abcde';
      const invalid = `${valid}f`;
      expect(hex.normalise(invalid)).toBe(valid);
    });

    it('should convert a hex buffer', () => {
      const str = '11ff22ddeeff';
      const buf = Buffer.from(str, 'hex');
      expect(hex.normalise(buf)).toBe(`0x${str}`);
    });

    describe('options.throwInvalidChars', () => {
      it('should throw on non-hex strings', () => {
        const str = '0x123abcdefg';
        expect(() => hex.normalise(str, { throwInvalidChars: true })).toThrow();
      });
    })

    describe('options.throwInvalidLength', () => {
      it('should throw invalid hex string length', () => {
        const str = '0x123abcdef';
        expect(() => hex.normalise(str, { throwInvalidLength: true })).toThrow();
      });
    });
  });
});