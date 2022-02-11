// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PullContractsCliArgs {
  token?: string;
  repo: string;
  owner: string;
  base: string;
  head: string;

  outBodyFile?: string;
  outPrNameFile?: string;
  outBranchNameFile?: string;
  outCommitTitle?: string;
}