import { getOctokit } from "@actions/github";

// TODO: test
describe('diffs', () => {
  it('todo: should work', async () => {
    // Create GitHub client with the API token.
    const token = process.env.GITHUB_TOKEN!;
    const client = getOctokit(token);

    // https://api.github.com/repos/octocat/linguist/compare/master...octo-org:master
    try {
      // https://api.github.com/repos/linguist/octocat/compare/master...octo-org%3Amaster
      // https://api.github.com/repos/octocat/linguist/compare/master...octo-org:master
      const response = await client.rest.repos.compareCommits({
        base: 'devop/pr-gh-action',
        head: 'test/gha',
        owner: 'EthVM',
        repo: 'evm-source-verification',
      })
    } catch (err) {
      console.error('ERROR:', err);
      throw err;
    }
    expect(true).toBe(true);
  });
});