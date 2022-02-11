# evm-source-verification

Ethereum smart contract source code verification.

Verifies contract sourcecode and saves the output to `contracts/<chainId>/<contractAddress>`.

With `evm-source-verification` you can

1. Submit your own smart contracts for verification (see [Submitting a contract](#submitting-a-contract))
2. Verify contracts locally (see [Commands](#commands))
3. View other verified contracts in `contracts/<chainId>/<contractAddress>`

Special thanks to [Sourcify](https://sourcify.dev/) and [Etherscan](https://etherscan.io/).

## Table of Contents

- [Submitting a contract](#submitting-a-contract)
- [Opening a verified contract in Remix IDE](#opening-a-verified-contract-in-remix-ide)
- [Getting Started](#getting-started)
- [Commands](#commands)
  - [verify](#verify)
    - [Verify mainnet contracts](#verify)
    - [Verify contract in a directory](#verify-contract-in-a-directory)
    - [Verify contracts in many directories](#verify-contracts-in-many-directories)

## Submitting a contract

### By Pull Request

You can submit your own contract for verification.

1. [Fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo) the [EthVM/evm-source-verification](https://github.com/EthVM/evm-source-verification) repository.
2. Create a folder `contracts/<chainId>/<contractAddress>/` with:
    1. `configs.json`: a JSON file specifying your contract
    2. `input.json`: the contract's [Solidity --standard-json compiler inpun](https://docs.soliditylang.org/en/develop/using-the-compiler.html).
3. Submit your fork with a [pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork) to the [EthVM/evm-source-verification main brach](https://github.com/EthVM/evm-source-verification/tree/main).
    - A Github Action will execute to verify your contract. If successful, your pull request will be closed and a new one will be opened with your contract's verified metadata to be pulled into the main branch.
4. Your contract and will then be merged into the main branch!

### Using EthVM

TODO

## Opening a verified contract in Remix IDE

TODO

## Getting Started

The following steps will enable you to develop `evm-source-verification` or verify your contracts locally.

### Clone the Repository

```sh
# via ssh
git@github.com:EthVM/evm-source-verification.git

# or via https
https://github.com/EthVM/evm-source-verification.git
```

### Set NodeJS and npm versions

Ensure the correct versions of NodeJS and NPM are installed.

We recommend using [Node Version Manager (nvm)](https://github.com/nvm-sh/nvm) to manage your NodeJS versions. You can find the NodeJS version in `./.nvmrc` and npm version in `./package.json#engines#npm`.

3. Install the project's dependencies

```sh
# from within the project's root directory
npm install
```

### Build the project

This will build the project into the `dist` folder

```sh
# from within the project's root directory
npm run build
```

You can now run develop on the project, execute [Commands](#commands), and run tests.

## Commands

`evm-source-verification` exposes cli commands to assist in contract verification.

To execute commands, first download and build the project. For steps, see [Getting Started](#getting-started)

### Verify

The verify command takes takes directories with `input.json` and `configs.json` files and compiles and verifies them against the blockchain.

For additional information on the verify command, use `dist/bin.js verify --help`


#### Verify mainnet contracts

```sh
node dist/bin.js \
  verify \
  --concurrency=10  `# process at most 10 contracts concurrently` \
  --chainId=1       `# verify contracts from chainId 1` \
  --failFast        `# exit on the first failure`
```

#### Verify contract in a directory

```sh
# verifying one contract in a directory
node dist/bin.js \
  verify \
  --concurrency=10 \
  --dir=~/my-contract   `# the contract's directory` \
  --save                `# save verified metadata to the contract's directory` \
  --failFast            `# exit on the first failure`
```

#### Verify contracts in many directories

```sh
# verify contracts from the piped directories
find contracts/1 -mindepth 1 -maxdepth 1 -type d \
  | head -n 1000        `# first 1000 contracts` \
  | node dist/bin.js \
    verify \
    --concurrency=10    `# process at most 10 contracts concurrently` \
    --dir=-             `# read directories from stdin`  \
    --save              `# save verified metadata to contract directories` \
    --jump=200          `# skip past the first 200 contracts`
```
