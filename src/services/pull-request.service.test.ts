import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { TestContractService } from "../../tests/utils/test-contract-service";
import { IProcesorService } from "./processor.service";
import { PullRequestFile, PullRequestService } from "./pull-request.service";
import { IDownloadService } from './download.service';
import { TestContract } from '../../tests/utils/test-contract';
import { fexists, randomBase16 } from "../libs/utils";

describe('PullRequestService', () => {
  let testCases: TestContract[];
  let tcontractService: TestContractService;
  let processorService: IProcesorService;
  let prService: PullRequestService;
  let dlService: IDownloadService;

  beforeEach(async () => {
    /**
     * mock downloads
     *
     * noop - no need to download
     * 
     * testCase contracts are already stored in filesystem
     */
    dlService = { async file() {}, };

    /**
     * mock processor
     *
     * noop - no need to download
     * 
     * testCase contracts are already verified in filesystem
     */
    processorService = { async process(): Promise<void> {}, }

    tcontractService = new TestContractService();
    prService = new PullRequestService(tcontractService, processorService, dlService);
    testCases = await tcontractService.getTestCases();
  });

  describe('process', () => {
    it(`should work`, async () => {
      const files = testCases.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.storage.getConfigFilename(),
          raw_url: '<url>',
          status: 'added',
        },
        {
          filename: contract.storage.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
      ]));

      // expect success (not to throw)
      await prService.process(files, { save: false });

      expect(true).toBeTruthy();
    });

    it('should throw if contract configs are missing', async () => {
      const files = testCases.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.storage.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
      ]));

      // expect success (not to throw)
      let err: Error | undefined;
      await prService
        .process(files, { save: false })
        .catch((_err) => { err = _err });

      expect(err).toBeInstanceOf(Error);
  });

    it('should throw if contract inputs are missing', async () => {
      const files = testCases.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.storage.getConfigFilename(),
          raw_url: '<url>',
          status: 'added',
        },
      ]));

      // expect success (not to throw)
      let err: Error | undefined;
      await prService
        .process(files, { save: false })
        .catch((_err) => { err = _err });

      expect(err).toBeInstanceOf(Error);
    });

    it('should throw if non-contract files were added', async () => {
      const files = testCases.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.storage.getConfigFilename(),
          raw_url: '<url>',
          status: 'added',
        },
        {
          filename: contract.storage.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
      ]));
      files.push({
        filename: 'unknown',
        raw_url: '<url>',
        status: 'added',
      })

      // expect success (not to throw)
      let err: Error | undefined;
      await prService
        .process(files, { save: false })
        .catch((_err) => { err = _err });

      expect(err).toBeInstanceOf(Error);
    });

    it('should throw if unknown contract-like files were added', async () => {
      const files = testCases.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.storage.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
        {
          filename: contract.storage.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
        {
          filename: path.join(contract.storage.getDirname(), 'randomfile'),
          raw_url: '<url>',
          status: 'added',
        },
      ]));

      // expect success (not to throw)
      let err: Error | undefined;
      await prService
        .process(files, { save: false })
        .catch((_err) => { err = _err });

      expect(err).toBeInstanceOf(Error);
    });

    it('should throw if any files were was mutated (other than added)', async () => {
      const files = testCases.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.storage.getInputFilename(),
          raw_url: '<url>',
          status: 'non-added-status',
        },
        {
          filename: contract.storage.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
      ]));

      // expect success (not to throw)
      let err: Error | undefined;
      await prService
        .process(files, { save: false })
        .catch((_err) => { err = _err });

      expect(err).toBeInstanceOf(Error);
    });

    it('should save pull-request name, commit name, branch name, body', async () => {
      const files = testCases.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.storage.getConfigFilename(),
          raw_url: '<url>',
          status: 'added',
        },
        {
          filename: contract.storage.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
      ]));
      const outPrNameFile = path.join(os.tmpdir(), randomBase16(10));
      const outBodyFile = path.join(os.tmpdir(), randomBase16(10));
      const outBranchNameFile = path.join(os.tmpdir(), randomBase16(10));
      const outCommitTitleFile = path.join(os.tmpdir(), randomBase16(10));
      expect(await fexists(outPrNameFile)).toBeFalsy();
      expect(await fexists(outBodyFile)).toBeFalsy();
      expect(await fexists(outBranchNameFile)).toBeFalsy();
      expect(await fexists(outCommitTitleFile)).toBeFalsy();
      await prService.process(files, {
        save: false,
        outPrNameFile,
        outBodyFile,
        outBranchNameFile,
        outCommitTitleFile,
      });
      expect(await fexists(outPrNameFile)).toBeTruthy();
      expect(await fexists(outBodyFile)).toBeTruthy();
      expect(await fexists(outBranchNameFile)).toBeTruthy();
      expect(await fexists(outCommitTitleFile)).toBeTruthy();
      await fs.promises.rm(outPrNameFile);
      await fs.promises.rm(outBodyFile);
      await fs.promises.rm(outBranchNameFile);
      await fs.promises.rm(outCommitTitleFile);
    })
  });
});