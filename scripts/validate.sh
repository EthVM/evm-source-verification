#! /usr/bin/env bash

# -e  exit on failure error codes
# -u  error on unknown variables
# -o  exit on errors in pipes

# 
# Validate contracts within list of files
#
# Supports many files over many chainIds
#
# Validates the matching chains & contracts are verified
#

set -euo pipefail

# execute the script in the context of the project's root directory
project_root=$(cd "$(dirname ${BASH_SOURCE[0]})/.."; pwd -P)
cd "$project_root"

programName=$0

function usage {
    echo "Usage: $programName [OPTION]... FILE"
    echo "   or: $programName [OPTION]... -"
    echo "   or: $programName FILE  [OPTION]..."
    echo "   or: $programName -     [OPTION]..."
    echo "   or: $programName"
    echo ""
    echo "  [file]              new-line delimited file containing the changed"
    echo "                      files"
    echo "  -                   changed files from stdsin (eg. pipe)"
    echo "  -h --help           print the usage documentation of this program"
    echo "     --verbose        print debug logs"
    exit $1 || "0";
}

function indent {
    if [[ "$1" ]]; then echo "$1" | sed -E 's/(.*)/    \1/'; fi
}

# "default" | "file" | "stdin"
INPUT_TYPE=
INPUT_FILE=
if [[ "$#" -gt "0" ]]; then
    if [[ "$1" != -*  ]]; then
        # first arg is <filename>, read from <filename>
        INPUT_TYPE="file"
        INPUT_FILE="$1"
        # remove <filename> arg
        shift

    elif [[ "${@: -1}" != -* ]]; then
        # last arg is <filename>, read from <filename>
        INPUT_TYPE="file"
        INPUT_FILE="${@: -1}"
        # https://stackoverflow.com/questions/20398499/remove-last-argument-from-argument-list-of-shell-script-bash
        # remove <filename> arg
        set -- "${@:1:$(($#-1))}"
    fi
fi

VERBOSE=
for i in "$@"; do
    case $i in
        -) INPUT_TYPE="stdin"; shift; ;;
        -h|--help) echo "help:"; usage 0; shift; ;;
        --verbose) VERBOSE="true"; shift; ;;
        -*|--*) echo "ERROR: unknown option \"$i\""; exit 1; ;;
    esac
done

if [[ "$VERBOSE" ]]; then
    echo "=== script: $programName ==="
    # print where we're getting blobs from:
    if [[ "$INPUT_TYPE" == "stdin" ]]; then echo "=== reading from: /dev/stdin ==="
    elif [[ "$INPUT_TYPE" == "file" ]]; then echo "=== reading from: file://$FILE_INPUT ==="
    elif [[ "$INPUT_TYPE" == "default" ]]; then echo "=== reading from: default ==="
    else echo "=== reading from: ??? ==="
    fi
fi

# newline separated directrories / globs with contracts
files=
# get contract directory blobs from input file
if [[ "$INPUT_TYPE" == "file" ]]; then files=${cat "$INPUT_FILE"}
# get contract directory blobs from stdin
elif [[ "$INPUT_TYPE" == "stdin" ]]; then files=$(cat)
else echo "ERROR: unexpected input type: \"$INPUT_TYPE\"" exit 1
fi

if [[ ! "$files" ]]; then
    echo "ERROR: no files"
    exit 1
fi


# find the different chains modified

# extract the unique contract directories added
#   s/ command:   substitute  https://www.gnu.org/software/sed/manual/html_node/The-_0022s_0022-Command.html
#   /p flag:      "If the substitution was made, then print the new pattern space"
#   -n argument:  "disable automatic printing except when explicitly told to via the p command"
#                 this causes sed to output nothing if nothing was matched 
#                 otherwise sed outputs the whole line if nothing matched
#   -E            "Use extended regular expressions rather than basic regular expressions"

# new-line separated string of chain-id contract-dir
chainIdsContractDirs=$( \
    echo "$files" \
    | sed -En 's/^(contracts\/([0-9]+)\/0x[a-f0-9]{40})\/.*/\2 \1/p' \
    | sort -u)

# new-line separated string of chain ids
chainIds=$(echo "$chainContractDirs" | awk '{ print $1 }' | sort -u)

# count the chains
chainCount=$(echo "$chainIds" | wc -l)
echo "chains: $chainCount"

if [[ "$VERBOSE" ]]; then
    echo "== files:"
    indent "$files"

    echo "== chainIdsContractDirs:"
    indent "$chainIdsContractDirs"

    echo "== chainIds:"
    indent "$chainIds"
fi

i=0
echo "$chainIds" | while IFS= read -r chainId; do
    ((i++)) || true
    echo "=== chain: $chainId ( $i / $chainCount )"

    # new-line separated string of contract-dirs for the chain
    contractDirs=$(echo "$chainIdsContractDirs" | grep -E "^$chainId\s" | awk '{ print $2 }')
    echo "$i ($chainId). contracts: $(echo $contractDirs | wc -l)"

    # get the provider
    # (|| :; avoids exiting from pipefail)
    providerUri=$({ grep -E "^$chainId:" ./config/nodes || :; } | sed -En 's/^[0-9]+:[^:]+:(.*)/\1/p')

    # get a fallback provider
    if [[ ! "$providerUri" ]]; then
        # search fallbacks for a provider
        providerUri$(jq -r \
          ".[] | select (.chainId == $chainId) | .rpc[] | select(contains(\"\${\") | not)" \
          ./config/nodes-fallback.json \
          | head -n 1)
    fi

    if [[ ! "$providerUri" ]]; then
      >&2 echo "ERROR: chain \"$chainId\" is not supported (has no providerUri)"
      exit 1
    fi

    verifyargs=( \
        "--failfast" \
        "--chainid=$chainId" \
        "--provider-uri=$providerUri" \
    )
    if [[ "$VERBOSE" ]]; then verifyargs+=("--verbose"); fi

    ./scripts/verify.sh "${verifyargs[@]}"
done


# echo "$chainIds" | while IFS= read -r contractDir; do

# if [[ ! "$contractdirs" ]]; then
#     echo "success - no contracts"
#     exit 0
# fi

# echo "validating $(echo "$contractdirs" | wc -l) contracts:"
# echo "$contractdirs"

# echo "$contractdirs" \
#   | ./verify.sh \
#     - \
#     --verbose \
#     --failfast \
#     --provider-uri="$provideruri" \
#     --chainid="$chainid"

# echo "success - $(echo "$contractdirs" | wc -l) contracts validated"