export interface VerifyCliArgs {
  chainId?: string;
  address?: string;
  dir?: string;
  file?: string;
  save: boolean;
  skip: boolean;
  failFast: boolean;
  jump?: number;
  concurrency?: number;
  git?: {
    token?: string;
    repo?: string;
    owner?: string;
    base?: string;
    head?: string;
  };
}
