import fs from 'node:fs';
import { UnimplementedError } from "../errors/unimplemented.error";
import { SolidityArchConfig, SOLIDITY_PLATFORMS } from '../libs/solidity';
import { ContractLanguage } from "../libs/support";
import { fexists, tmpFilename } from "../libs/utils";
import { CompilerFsService, ICompilerFsService } from "./compiler-fs.service";
import { IFileDownloader } from "./download.service";
import { ISolidityArchProvider, SolidityArchProvider } from './solidity-arch.provider';

describe('CompilerFsService', () => {
  let solArchProvider: ISolidityArchProvider;
  beforeAll(() => {
    solArchProvider = new SolidityArchProvider()
  });

  describe('getCompilerFilename', () => {
    let compilerFsService: ICompilerFsService;
    beforeAll(() => {
      const mockDownloadService: IFileDownloader = {
        file() { throw new UnimplementedError('file'); },
      };
      const dirname = tmpFilename();
      compilerFsService = new CompilerFsService(
        mockDownloadService,
        { dirname },
      );
    });

    it('should work with wasm', () => {
      const arch = solArchProvider.getWasmArch();
      compilerFsService.getCompilerFilename({
        longVersion: '<longVersion>',
        archConfig: arch,
        language: ContractLanguage.Solidity,
      });
      expect(true).toBeTruthy();
    });

    it('should work with all platforms', () => {
      for (const platform of SOLIDITY_PLATFORMS) {
        const arch = solArchProvider.getPlatformArch(platform);
        compilerFsService.getCompilerFilename({
          longVersion: '<longVersion>',
          archConfig: arch,
          language: ContractLanguage.Solidity,
        });
        expect(true).toBeTruthy();
      }
    });
  });

  describe('download', () => {
    let calls: number;
    const compilerContent = '<<< compiler contents >>>';
    const longVersion = "0.0.0+commit.00000000";
    const longVersionUnused = "0.0.0+commit.00000001";
    const language = ContractLanguage.Solidity;
    let arch: SolidityArchConfig;
    let compilersDirname: string;
    let compilerFilename: string;
    let compilerFsService: CompilerFsService;

    beforeEach(async() => {
      calls = 0;
      const mockDownloadService: IFileDownloader = {
        async file(uri: string, filename: string): Promise<void> {
          calls += 1;
          await fs
            .promises
            .writeFile(filename, compilerContent, 'utf-8');
        },
      };
      compilersDirname = tmpFilename();
      compilerFsService = new CompilerFsService(
        mockDownloadService,
        { dirname: compilersDirname },
      );
      arch = solArchProvider.getWasmArch();
      compilerFilename = compilerFsService.getCompilerFilename({
        language,
        longVersion,
        archConfig: arch,
      });
      await compilerFsService.download({
        filename: compilerFilename,
        makeExecutable: false,
        uri: '<nothing>',
      })
    })

    afterEach(async () => {
      await fs
        .promises
        .rm(compilersDirname, { force: true, recursive: true });
    });

    it('should download a compiler if it does not exist', async () => {
      expect(await fexists(compilerFilename)).toBeTruthy();
      expect(calls).toEqual(1);
    });

    it('should cache downloads', async () => {
      expect(await fexists(compilerFilename)).toBeTruthy();
      await compilerFsService.download({
        filename: compilerFilename,
        makeExecutable: false,
        uri: '<nothing>',
      })
      // expect cached the last call
      expect(calls).toEqual(1);
    });

    it('should not download a compiler if it already exists', async () => {
      const nextCompilerFilename = compilerFsService.getCompilerFilename({
        language,
        archConfig: arch,
        longVersion: longVersionUnused,
      });

      const contentBefore = '<<< next >>>';

      await fs
        .promises
        .writeFile(nextCompilerFilename, contentBefore, 'utf-8');

      await compilerFsService.download({
        filename: nextCompilerFilename,
        makeExecutable: false,
        uri: '<nothing>',
      });

      // expect that the compiler didn't download
      // because the file already existed
      const contentsAfter = await fs
        .promises
        .readFile(nextCompilerFilename, 'utf-8');

      expect(contentBefore).toEqual(contentsAfter);
    });
  });
});