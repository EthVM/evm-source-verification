// eslint-disable-next-line import/no-extraneous-dependencies
import fs from 'fs';
import { arrObjPush, arrPush, tmpFile, hasOwn, randomAddress, readJSONFile, writeJSONFile, isSafeFilename } from './utils';

describe('utils', () => {
  describe('hasOwn', () => {
    it('should test whether an object has a property on itself', () => {
      const prop = 'prop'
      const obj = { [prop]: 'value' };
      expect(prop in obj).toBeTruthy();
      expect(hasOwn(obj, prop)).toBeTruthy();
    });

    it('should not find properties on the objects prototype chain', () => {
      const prop = 'prop';
      const proto = { [prop]: 'value' };
      const obj = Object.create(proto);
      expect(prop in obj).toBeTruthy();
      expect(hasOwn(obj, prop)).toBeFalsy();
    });
  });

  describe('readJsonFile', () => {
    it('should read and parse JSON from a JSON formatted file', async () => {
      const [filename] = await tmpFile({ discardDescriptor: true });
      try {
        const data = { hello: 'world' };
        await fs.promises.writeFile(filename, JSON.stringify(data), 'utf-8');
        const out = await readJSONFile<typeof data>(filename);
        expect(out).toEqual(data);
      } finally {
        await fs.promises.rm(filename, { recursive: true });
      }
    });

    it('should throw if the file is not JSON formatted', async () => {
      const [filename] = await tmpFile({ discardDescriptor: true });
      try {
        await fs.promises.writeFile(filename, 'not a json file', 'utf-8');
        await expect(() => readJSONFile(filename)).rejects.toThrow();
      } finally {
        await fs.promises.rm(filename, { recursive: true });
      }
    });

    it('should return undefined if the file does not exist', async () => {
      const [filename] = await tmpFile({ discardDescriptor: true });
      try {
        await fs.promises.rm(filename);
        const out = await readJSONFile(filename);
        expect(out).toBeUndefined();
      } finally {
        //
      }
    });
  });

  describe('writeJsonFile', () => {
    it('should write JSON format to a file', async () => {
      const [filename] = await tmpFile({ discardDescriptor: true });
      try {
        const data = { hello: 'world' };
        await writeJSONFile(filename, data);
        const out = await fs.promises.readFile(filename, 'utf-8');
        expect(out).toEqual(JSON.stringify(data));
      } finally {
        await fs.promises.rm(filename, { recursive: true });
      }
    });

    it('should respect options.pretty', async () => {
      const [filename] = await tmpFile({ discardDescriptor: true });
      try {
        const data = { hello: 'world' };
        await writeJSONFile(filename, data, { pretty: true });
        const out = await fs.promises.readFile(filename, 'utf-8');
        expect(out).toEqual(JSON.stringify(data, null, 2));
      } finally {
        await fs.promises.rm(filename, { recursive: true });
      }
    });
  });

  describe('arrObjPush', () => {
    it('should create the key if it doesn\t exit', () => {
      const obj: Record<string, string[]> = { ethvm: ['rocks'] }; 
      expect('ethereum' in obj).toBeFalsy();
      expect(arrObjPush(obj, 'ethereum', 'rules',)).toBeTruthy();
      expect('ethereum' in obj).toBeTruthy();
      expect(obj.ethereum).toEqual(['rules']);
    });

    it('should append the value if the key exists', () => {
      const obj: Record<string, string[]> = { ethvm: ['rocks'] }; 
      expect(arrObjPush(obj, 'ethvm', 'rules',)).toBeTruthy();
      expect(obj.ethvm).toEqual(['rocks', 'rules']);
    });

    it('should return false if the value was not inserted', () => {
      const obj: Record<string, string[]> = { ethvm: ['rocks'] }; 
      expect(arrObjPush(obj, 'ethvm', 'rocks',)).toBeFalsy();
      expect(obj.ethvm).toEqual(['rocks']);
    });
  });

  describe('arrPush', () => {
    it('should return true if the value was inserted', () => {
      const arr: string[] = ['ethvm']; 
      expect(arr.includes('ethereum')).toBeFalsy();
      expect(arrPush(arr, 'ethereum')).toBeTruthy();
      expect(arr.includes('ethereum')).toBeTruthy();
      expect(arr).toEqual(['ethvm', 'ethereum']);
    });

    it('should return false if the value was not inserted', () => {
      const arr: string[] = ['ethvm']; 
      expect(arrPush(arr, 'ethvm')).toBeFalsy();
      expect(arr).toEqual(['ethvm']);
    });
  });

  describe('randomAddress', () => {
    it('should create a random ethereum address', () => {
      const address = randomAddress();
      expect(address).toMatch(/^0x[a-f0-9]{40}$/);
    });
  });

  describe('fexists', () => {
    it('todo: should work', () => {
      expect(true).toBeTruthy();
    });
  });

  describe('isSafeFilename', () => {
    describe('should pass', () => {
      // 0-9, a-z, A-Z, _, -, ., ' ', +
      const pass = 'a123B345c678D90_e.F_g+H=I-j.K l.M n';
      it(`name: ${pass}`, () => expect(isSafeFilename(pass)).toBeTruthy());

      const sol1 = 'solc-v0.8.6+commit.11564f7e'
      it(`name: ${sol1}`, () => expect(isSafeFilename(sol1)).toBeTruthy());

      const sol2 = 'solc-v0.8.7+commit.e28d00a7'
      it(`name: ${sol2}`, () => expect(isSafeFilename(sol2)).toBeTruthy());
    });

    describe('should reject', () => {
      const empty = '';
      it(`name: ${empty}`, () => expect(isSafeFilename(empty)).toBeFalsy());

      const slashes = 'has/dashes';
      it(`name: ${slashes}`, () => expect(isSafeFilename(slashes)).toBeFalsy());
    });
  });
});