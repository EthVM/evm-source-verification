# evm-source-verification

EVM Contract Source Code Verification.

Verifies Ethereum smart contracts.

Special thanks to [Sourcify](https://sourcify.dev/) and [Etherscan](https://etherscan.io/).

## Table of Contents

- [Adding a contract](#adding-a-contract)
- [Opening a verified contract in Remix IDE](#opening-a-verified-contract-in-remix-ide)

## Adding a contract

### By Pull Request

You can submit your own contract for verification.

1. [Fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo) the [EthVM/evm-source-verification](https://github.com/EthVM/evm-source-verification) repository.
2. Add a configs.json file specifying your contract and input.json file with the compiler input.
3. Submit your fork with a [Pull Request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork) to the [EthVM/evm-source-verification main brach](https://github.com/EthVM/evm-source-verification/tree/main).
  - This will trigger a Github Action to verify your contract. If successful, your Pull Request will be closed and a new one will be opened with your contract's verified metadata to be pulled into the main branch.
4. Your contract will then be merged into the main branch!

### Using EthVM

## Opening a verified contract in Remix IDE
