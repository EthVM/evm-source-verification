import { HttpError } from "../errors/http.error";
import { downloadFile } from "./download";
import { SolidityCompilerName } from "./solidity";
import { tmpFilename } from "./utils";

describe('download', () => {
  describe('downloadFile', () => {
    it('should throw if the url is not found', async () => {
      // this compiler doesn't exist
      // const compilername = 'v0.5.9+commit.aaaaaa';
      const compilername: SolidityCompilerName = '0.999.999+commit.aaaaaa';
      const url = `https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/linux-amd64/solc-linux-amd64-${compilername}`
      const filename = tmpFilename();
      let err: undefined | Error;
      let thrown = false;
      await downloadFile(url, filename).catch(_err => {
        err = _err;
        thrown = true;
      });
      expect(thrown).toBeTruthy();
      expect(err).toBeTruthy();
      expect(typeof err === 'object').toBeTruthy();
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).statusCode).toBe(404);
    });
  });
})