export interface VerifyCliArgs {
  chainId?: string;
  address?: string;
  dirs?: string;
  save: boolean;
  skip: boolean;
  failFast: boolean;
  jump?: number;
  concurrency?: number;
}
