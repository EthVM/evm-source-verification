export interface VerifyCliArgs {
  chainId?: string;
  address?: string;
  file?: string;
  save: boolean;
  skip: boolean;
  failFast: boolean;
  git?: {
    token?: string;
    repo?: string;
    owner?: string;
    base?: string;
    head?: string;
  };
}
