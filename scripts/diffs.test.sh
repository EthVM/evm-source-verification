#! /usr/bin/env bash

# -e  exit on failure error codes
# -u  error on unknown variables
# -o  exit on errors in pipes
set -euo pipefail

# execute the script in the context of the project's root directory
project_root=$(cd "$(dirname ${BASH_SOURCE[0]})/.."; pwd -P)
cd "$project_root"

function indent {
  if [[ "$1" ]]; then echo "$1" | sed -E 's/(.*)/  \1/'; fi
}

input=$(
echo "A      contracts/1/0x0a0c7c7d8faa70e6d88aab1663b40da88115c228/configs.json"
echo "A      contracts/1/0x0a0c7c7d8faa70e6d88aab1663b40da88115c228/input.json"
echo "A      contracts/1/0x0a1d5aab0964d96a47706d7416a24d8703842b53/configs.json"
echo "A      contracts/1/0x0a1d5aab0964d96a47706d7416a24d8703842b53/input.json"
)

echo "input:"
indent "$input"

echo "=================="
echo ">>> test: diffs.sh"
echo "=================="

echo "$input" | ./scripts/diffs.sh -v -s

echo "validated"
