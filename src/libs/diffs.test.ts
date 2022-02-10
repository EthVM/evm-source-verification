import { components } from '@octokit/openapi-types';
import { getDiffs2 } from './diffs';

describe('diffs', () => {
  const added: components["schemas"]["diff-entry"][] = [
    {
      "sha": "3d3586628da1be0d25ddd1a65d162d1b6bcf51c1",
      "filename": "contracts/1/0x0000000000003f5e74c1ba8a66b48e6f3d71ae82/configs.json",
      "status": "added",
      "additions": 1,
      "deletions": 0,
      "changes": 1,
      "blob_url": "https://github.com/EthVM/evm-source-verification/blob/63fa522ea7e7f8bf7c6a60386f2bf534721c1cee/contracts/1/0x0000000000003f5e74c1ba8a66b48e6f3d71ae82/configs.json",
      "raw_url": "https://github.com/EthVM/evm-source-verification/raw/63fa522ea7e7f8bf7c6a60386f2bf534721c1cee/contracts/1/0x0000000000003f5e74c1ba8a66b48e6f3d71ae82/configs.json",
      "contents_url": "https://api.github.com/repos/EthVM/evm-source-verification/contents/contracts/1/0x0000000000003f5e74c1ba8a66b48e6f3d71ae82/configs.json?ref=63fa522ea7e7f8bf7c6a60386f2bf534721c1cee",
      "patch": "@@ -0,0 +1 @@\n+{\"name\":\"MyRouter\",\"compiler\":\"v0.6.6+commit.6c089d02\",\"optimization\":false,\"runs\":200,\"constructorBytes\":\"\",\"evmVersion\":\"istanbul\",\"library\":\"\",\"proxyContract\":false,\"chainId\":\"0x01\",\"address\":\"0x0000000000003f5e74c1ba8a66b48e6f3d71ae82\"}\n\\ No newline at end of file"
    },
  ];
  const modified: components["schemas"]["diff-entry"][] = [
    {
      "sha": "688043d174cbc98a53122dcce19c7558a5a6ec16",
      "filename": "state/1/hash.metaless.json",
      "status": "modified",
      "additions": 1,
      "deletions": 13655,
      "changes": 13656,
      "blob_url": "https://github.com/EthVM/evm-source-verification/blob/63fa522ea7e7f8bf7c6a60386f2bf534721c1cee/state/1/hash.metaless.json",
      "raw_url": "https://github.com/EthVM/evm-source-verification/raw/63fa522ea7e7f8bf7c6a60386f2bf534721c1cee/state/1/hash.metaless.json",
      "contents_url": "https://api.github.com/repos/EthVM/evm-source-verification/contents/state/1/hash.metaless.json?ref=63fa522ea7e7f8bf7c6a60386f2bf534721c1cee"
    },
    {
      "sha": "2fdda159460895df6a4506eeb1b92d3beefcb819",
      "filename": "state/1/hash.opcode.json",
      "status": "modified",
      "additions": 1,
      "deletions": 12623,
      "changes": 12624,
      "blob_url": "https://github.com/EthVM/evm-source-verification/blob/63fa522ea7e7f8bf7c6a60386f2bf534721c1cee/state/1/hash.opcode.json",
      "raw_url": "https://github.com/EthVM/evm-source-verification/raw/63fa522ea7e7f8bf7c6a60386f2bf534721c1cee/state/1/hash.opcode.json",
      "contents_url": "https://api.github.com/repos/EthVM/evm-source-verification/contents/state/1/hash.opcode.json?ref=63fa522ea7e7f8bf7c6a60386f2bf534721c1cee"
    },
  ]
  const files: components["schemas"]["diff-entry"][] = [
    ...added,
    ...modified,
  ];

  describe('getDiffs2', () => {
    // eslint-disable-next-line prefer-destructuring

    it('should get the diffs', async () => {
      const diffs = getDiffs2(files);
      expect(diffs.all.size)
        .toEqual(files.length);

      expect(diffs.added.size)
        .toEqual(added.length);

      expect(diffs.modified.size)
        .toEqual(modified.length);

      expect(Array.from(diffs.added.values()))
      .toEqual(added);

      expect(Array.from(diffs.added.keys()))
      .toEqual(added.map(_added => _added.filename));

      expect(Array.from(diffs.modified.keys()))
        .toEqual(modified.map(_modified => _modified.filename));
    });
  });
});