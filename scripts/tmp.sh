#! /usr/bin/env bash

set -euo pipefail

for i in "$@"; do
    echo "hi i: $i"
done

echo "hello world"