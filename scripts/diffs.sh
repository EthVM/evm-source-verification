#! /usr/bin/env bash

#
# extract new contracts from git diffs
#
# diffs.sh expects input from the git diff command of format
# --name-status
#
# --strict mode validates that *only* contracts were added and nothing else
# was added, modified or deleted
# 
# example input:
# A      contracts/1/0x1../...
# A      contracts/1/0x2../...
# M      <modified_file>
# D      <deleted_file>
#

# -e  exit on failure error codes
# -u  error on unknown variables
# -o  exit on errors in pipes
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
    echo "  [file]              file with git-diff input to read from"
    echo "  -                   read git-diff from stdin (eg. pipe)"
    echo "  -h --help           print the usage documentation of this program"
    echo "     --verbose        print debug logs"
    echo "     --strict         error if any anything other than contracts have"
    echo "                      been added"
    echo "     --provider-uri=  web3 provider"
    exit $1 || "0";
}

function indent {
    if [[ "$1" ]]; then echo "$1" | sed -E 's/(.*)/    \1/'; fi
}

# "default" | "file" | "stdin"
INPUT_TYPE="default"
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

INPUT=
STRICT=
VERBOSE=
PROVIDER_URI=
for i in "$@"; do
    case $i in
        -) INPUT_TYPE="stdin"; shift; ;;
        -h|--help) echo "help:"; usage 0; shift ;;
        --strict) STRICT="true"; shift; ;;
        --verbose) VERBOSE="true"; shift; ;;
        --provider-uri=*) PROVIDER_URI="${i#*=}"; shift; ;;
        -*|--*) echo "ERROR: unknown option \"$i\""; usage 1; shift; ;;
    esac
done

if [[ "$VERBOSE" ]]; then
    echo "=== script: $programName ==="
    if [[ "$INPUT_TYPE" == "file" ]]; then echo "=== reading from: file://$FILE_INPUT ==="
    elif [[ "$INPUT_TYPE" == "stdin" ]]; then echo "=== reading from: /dev/stdin ==="
    elif [[ "$INPUT_TYPE" == "default" ]]; then echo "=== reading from: default ==="
    else echo "=== reading from: ??? ==="
    fi
fi

diff=
if [[ "$INPUT_TYPE" == "file" ]]; then diff=${cat "$INPUT_FILE"}
elif [[ "$INPUT_TYPE" == "stdin" ]]; then diff=$(cat)
elif [[ "$INPUT_TYPE" == "default" ]]; then
    diff=$(git --no-pager diff --name-status main HEAD)
else echo "ERROR: unexpected input type: \"$INPUT_TYPE\"" exit 1
fi

# ===============
# parse git diffs
# ===============

added=$(echo "$diff" | { grep -E '^A\s' || :; } | awk '{ print $2 }')
modified=$(echo "$diff" | { grep -E '^M\s' || :; } | awk '{ print $2 }')
deleted=$(echo "$diff" | { grep -E '^D\s'  || :; } | awk '{ print $2 }' )

if [[ "$VERBOSE" ]]; then
    echo "=== changes ==="

    echo "input:"
    indent "$diff"

    echo "added:"
    indent "$added"

    echo "modified:"
    indent "$modified"

    echo "deleted:"
    indent "$deleted"
fi

if [[ "$STRICT" ]]; then
    if [[ "$modified" ]] || [[ "$deleted" ]]; then
        # disallow other mutations when submitting a contract
        >&2 echo "STRICT_MODE_ERROR: you cannot delete or modify files"
        exit 1
    fi
fi

# =================
# extract contracts
# =================

# contract-like
contractlike=$(echo "$added" | { grep -E '^contracts/' || :; })
# valid contracts
contracts=$(echo "$added" | { grep -E '^contracts/[0-9]+/0x[0-9a-f]{40}/' || :; })
# invalid contracts
contracts_invalid=$(echo "$contractlike" | { grep "$contracts" -v || :; })
# everything added that isn't contract-like
added_invalid=$(echo "$added" | { grep "$contractlike" -v || :; })

if [[ "$VERBOSE" ]]; then
    echo "=== contracts ==="

    echo "contractlike:"
    indent "$contractlike"

    echo "contracts:"
    indent "$contracts"

    echo "contracts_invalid:"
    indent "$contracts_invalid"

    echo "added_invalid:"
    indent "$added_invalid"
fi

# =================================
# validate parsed diffs & contracts
# =================================

if [[ "$STRICT" ]] && [[ "$added_invalid" ]]; then
    # added files that are not contracts
    >&2 echo "STRICT_MODE_ERROR: you cannot add non-contract files"
    >&2 echo "found:"
    >&2 echo "$(indent "$added_invalid")"
    exit 1
fi

if [[ "$contracts_invalid" ]]; then
    # found contract-like files but that not formated correctly
    >&2 echo "ERROR: invalid contracts"
    >&2 echo "found:"
    >&2 echo "$(indent "$contracts_invalid")"
    exit 1
fi

# assert contracts were actually found
if [[ ! "$contracts" ]]; then
    echo "ERROR: no new contracts found"
    exit 1
fi

# ======================================
# get directories of the added contracts
# ======================================

# extract the unique contract directories added
#   s/ command:   substitute  https://www.gnu.org/software/sed/manual/html_node/The-_0022s_0022-Command.html
#   /p flag:      "If the substitution was made, then print the new pattern space"
#   -n argument:  "disable automatic printing except when explicitly told to via the p command"
#                 this causes sed to output nothing if nothing was matched 
#                 otherwise sed outputs the whole line if nothing matched
#   -E            "Use extended regular expressions rather than basic regular expressions"
contractdirs=$(echo "$contracts" \
    | sed -En 's/^(contracts\/[0-9]+\/0x[a-f0-9]{40})\/.*/\1/p' \
    | sort -u)

if [[ "$VERBOSE" ]]; then
    echo "=== contract dirs ==="
    indent "$contractdirs"
fi

# validate the contracts
params=()
params+=("-")
params+=("--failfast")
if [[ "$VERBOSE" ]]; then params+=("--verbose"); fi
if [[ "$PROVIDER_URI" ]]; then params+=("--provider-uri=$PROVIDER_URI"); fi
echo "$contractdirs" | ./scripts/verify.sh "${params[@]}"
