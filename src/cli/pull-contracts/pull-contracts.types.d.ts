// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PullContractsCliArgs {
  token?: string;
  repo: string;
  owner: string;
  base: string;
  head: string;
  requireContracts: boolean;
  outputVerifiedAddresses?: string;
}