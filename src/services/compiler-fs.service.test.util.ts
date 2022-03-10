import path from "node:path";
import { CompilerFsService } from "./compiler-fs.service";
import { IDownloadService } from "./download.service";

const compilersPath = (cwd: string) => path.join(
  cwd,
  'tests',
  'compilers',
);

/**
 * Provides access to compilers for tests
 *
 * Compilers are pre downloaded to speed up tests
 */
export class TestCompilerFsService extends CompilerFsService {
  constructor(downloadService: IDownloadService) {
    super(downloadService, {
      dirname: compilersPath(process.cwd() ),
    });
  }

  /**
   * Absolute directory name of the compilers
   *
   * @returns Absolute directory name of the compilers
   */
  public getDirname(): string {
    return super.getDirname();
  }
}