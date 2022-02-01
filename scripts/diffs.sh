#! /usr/bin/env bash

#
# extract new contracts from git diffs
#
# diff.sh expects input from the git diff command with options 
# --name-status
#
# input can come from -i, --input or pipe. 
# TODO: default to INPUT=$(git --no-pager diff --name-status main HEAD)
# 
# --strict mode validates that *only* contracts were added and nothing else
# was modified or deleted
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
    echo "usage: $programName"
    echo "  -h --help     [false]   print the usage documentation of this"
    echo "                          program"
    echo "  -v --verbose  [false]   print debug logs"
    echo "  -i --inupt    [git --no-pager diff --name-status main HEAD]"
    echo "                          git-diff input"
    echo "  -s --strict   [false]   error if any anything other than contracts"
    echo "                          have been added"
    exit $1 || "0";
}

function indent {
    if [[ "$1" ]]; then echo "$1" | sed -E 's/(.*)/    \1/'; fi
}

INPUT=
STRICT=
VERBOSE=
for i in "$@"; do
    case $i in
        -h|--help)
        echo "help:"
        usage 0
        shift
        ;;

        -s|--strict)
        # error if non-contract values were found in the git diff
        # error if the git diff includes modifications, deletions, or
        # non contract-like additions
        STRICT="true"
        shift;
        ;;

        -v|--verbose)
        VERBOSE="true"
        shift;
        ;;

        -i=*|--input=*)
        INPUT="${i#*=}";
        shift;
        ;;

        -*|--*)
        echo "ERROR: unknown option \"$i\""
        usage 1
        shift
        ;;
    esac
done

# try to load input if not already given
if [[ ! "$INPUT" ]]; then
    if [[ ! -t 0 ]]; then
        # read from stdin if it's not open (ie terminal is not interactive, we've
        # probably received a pipe)
        # https://stackoverflow.com/questions/911168/how-can-i-detect-if-my-shell-script-is-running-through-a-pipe/911213#911213
        if [[ "$VERBOSE" ]]; then echo "loading input from stdin"; fi
        INPUT=$(cat)
    else
        # no pipe, load directly from current git branch vs main
        # TODO: is this desirable behavior?
        if [[ "$VERBOSE" ]]; then echo "loading input directly from git"; fi
        INPUT=$(git --no-pager diff --name-status main HEAD)
    fi
fi

# still no $input?
if [[ ! "$INPUT" ]]; then
    echo "Error: no INPUT"
    exit 1
fi

diff=$INPUT

if [[ "$VERBOSE" ]]; then
    echo "=== diff ==="
    indent "$diff"
fi

# ===============
# parse git diffs
# ===============

added=$(echo "$diff" | { grep -E '^A\s' || :; } | awk '{ print $2 }')
modified=$(echo "$diff" | { grep -E '^M\s' || :; } | awk '{ print $2 }')
deleted=$(echo "$diff" | { grep -E '^D\s'  || :; } | awk '{ print $2 }' )

if [[ "$VERBOSE" ]]; then
    echo "=== changes ==="

    echo "added:"
    indent "$added"
    echo "modified:"
    indent "$modified"
    echo "deleted:"
    indent "$deleted"
fi

if [[ "$STRICT" ]] && [[ "$modified" ]] || [[ "$deleted" ]]; then
    # disallow other mutations when submitting a contract
    >&2 echo "STRICT_MODE_ERROR: you cannot delete or modify files"
    exit 1
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
params+=("--failfast")
if [[ "$VERBOSE" ]]; then params+=("--verbose"); fi
echo "$contractdirs" | ./scripts/verify.sh "${params[@]}"
