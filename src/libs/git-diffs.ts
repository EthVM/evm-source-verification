import { getOctokit } from "@actions/github";
import { getDiffs } from "./diffs";

export interface GitDiffOptions {
  base: string;
  head: string;
  owner: string;
  repo: string;
}

/**
 * Get git diffs between two branches
 * 
 * @param gh    GitHub API client
 * @param opts  options
 */
// eslint-disable-next-line import/export
export async function getGitDiffs(
  gh: ReturnType<typeof getOctokit>,
  opts: GitDiffOptions,
): Promise<getDiffs.Diffs> {
  const { base, head, owner, repo } = opts;
  // Use GitHub's compare two commits API.
  // https://developer.github.com/v3/repos/commits/#compare-two-commits
  const res = await gh.rest.repos.compareCommits({ base, head, owner, repo});
  const { data } = res;
  const { files } = data;
  const diffs = getDiffs(files || []);
  return diffs;
}
