import { promisify } from 'util';
// eslint-disable-next-line import/no-extraneous-dependencies
import _tmp from 'tmp';
import fs from 'fs';
import { arrObjPush, arrPush, hasOwn, readJsonFile, writeJsonFile } from './utils';

const tmpfile = promisify(_tmp.file);

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
      const filename = await tmpfile();
      const data = { hello: 'world' };
      await fs.promises.writeFile(filename, JSON.stringify(data), 'utf-8');
      const out = await readJsonFile<typeof data>(filename);
      expect(out).toEqual(data);
    });

    it('should throw if the file is not JSON formatted', async () => {
      const filename = await tmpfile();
      await fs.promises.writeFile(filename, 'not a json file', 'utf-8');
      await expect(() => readJsonFile(filename)).rejects.toThrow();
    });

    it('should return undefined if the file does not exist', async () => {
      const filename = await tmpfile();
      await fs.promises.rm(filename);
      const out = await readJsonFile(filename);
      expect(out).toBeUndefined();
    });
  });

  describe('writeJsonFile', () => {
    it('should write JSON format to a file', async () => {
      const filename = await tmpfile();
      const data = { hello: 'world' };
      await writeJsonFile(filename, data);
      const out = await fs.promises.readFile(filename, 'utf-8');
      expect(out).toEqual(JSON.stringify(data));
    });

    it('should respect options.pretty', async () => {
      const filename = await tmpfile();
      const data = { hello: 'world' };
      await writeJsonFile(filename, data, { pretty: true });
      const out = await fs.promises.readFile(filename, 'utf-8');
      expect(out).toEqual(JSON.stringify(data, null, 2));
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
});