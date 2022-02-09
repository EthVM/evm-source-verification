// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ValidateGitDiffsCliArgs {
  token?: string;
  repo: string;
  owner: string;
  base: string;
  head: string;
  strict: boolean;
  verify: boolean;
  verbose: boolean;
  saveAdditions: boolean;
  requireContracts: boolean;
}