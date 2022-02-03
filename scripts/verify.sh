#! /usr/bin/env bash

# [x] -e  exit on failure error codes
# -u  error on unknown variables
# -o  exit on errors in pipes
set -uo pipefail

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
    echo "  [file]              contract directories to verify"
    echo "  -                   contract directories to verify from stdsin (eg. pipe)"
    echo "  -h --help           print the usage documentation of this program"
    echo "     --verbose        print debug logs"
    echo "     --skip           skip contracts who already have metadata"
    echo "     --build          build the NodeJS app before verifying"
    echo "     --clean          delete all previous metadata and state from"
    echo "                      target directories before verifying"
    echo "     --failfast       exit on first failure"
    echo "     --save           save validation results"
    echo "     --log            store failure log outputs"
    echo "     --chainid        id of the chain"
    echo "     --provider-uri=  web3 provider"
    exit $1 || "0";
}

function indent {
    if [[ "$1" ]]; then echo "$1" | sed -E 's/(.*)/    \1/'; fi
}

CONFIG_FILE="out/configs.json"

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

VERBOSE=
SKIP=
BUILD=
CLEAN=
FAIL_FAST=
SAVE=
LOG=
CHAIN_ID="1"
PROVIDER_URI=
for i in "$@"; do
    case $i in
        -) INPUT_TYPE="stdin"; shift; ;;
        -h|--help) echo "help:"; usage 0; shift; ;;
        --verbose) VERBOSE="true"; shift; ;;
        --skip) SKIP="true"; shift; ;;
        --build) BUILD="true"; shift; ;;
        --clean) CLEAN="true"; shift; ;;
        --save) SAVE="true"; shift; ;;
        --log) LOG="true"; shift; ;;
        --failfast) FAIL_FAST="true"; shift; ;;
        --chainid=*) CHAIN_ID="${i#*=}"; shift; ;;
        --provider-uri=*) PROVIDER_URI="${i#*=}"; shift; ;;
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
contractDirs=
# get contract directories from new-line separated input file
if [[ "$INPUT_TYPE" == "file" ]]; then contractDirs=${cat "$INPUT_FILE"}
# get contract directories from stdin
elif [[ "$INPUT_TYPE" == "stdin" ]]; then contractDirs=$(cat)
# get contract directories from the target chain
elif [[ "$INPUT_TYPE" == "default" ]]; then
    contractDirs=$(find "contracts/$CHAIN_ID" -mindepth 1 -maxdepth 1 -type d)
else echo "ERROR: unexpected input type: \"$INPUT_TYPE\"" exit 1
fi

# delete metadata from matching directories and all state for a fresh start
if [[ "$CLEAN" ]]; then
    # get the metadata files being deleted
    echo "finding metadata files..."
    contractCount=$(echo "$contractDirs" | wc -l)
    rmFiles=$(echo "$contractDirs" | xargs -I {} find {} -type f -name "metadata.json" 2>/dev/null)
    rmCount=$(echo "$rmFiles" | wc -l)

    # log some of the files being removed
    if [[ "$rmFiles" ]]; then
        echo "found metadata to remove:"
        i=0
        echo "$rmFiles" | while IFS= read -r rmFile; do
            ((i++))
            if [[ "$i" -gt 5 ]]; then break; fi
            indent "$rmFile"
        done
        if [[ "$rmCount" -gt "$i" ]]; then indent "/ $rmCount ..."; fi
    fi

    # get confirmation
    msg="Are you sure you want to delete metadata from $rmCount / $contractCount contracts and all state? [y/n] "
    read -r -p "$msg" confirm
    case "$confirm" in
        [yY])
            echo "removing metadata from $(rmCount) / ($contractCount) contracts"
            exit 0
            for rmFile in "$rmFiles"; do
                echo "removing: $rmFile"
                rm $rmFile
            done
            echo "removing ./state"
            rm -rf ./state
            echo "finished cleaning"
            ;;
        *)
            echo "exiting"
            exit 1
            ;;
    esac
fi

# build the project
if [[ "$BUILD" ]]; then
    # (it's fast with tsconfig.json#compilerOptions#incremental)
    echo "building"
    # exit on fail
    npm run build || exit $?
fi

if [[ ! "$contractDirs" ]]; then
    if [[ "$DEBUG" ]]; then echo "nothing to verify"; fi
    exit 0
fi

# create necessary directories
mkdir -p "./out"
mkdir -p "./compilers"
mkdir -p "./state"
mkdir -p "./state/compilers"
mkdir -p "./state/logs"

i=0
# dir=contracts/1/0x0131b36ad41b041db46ded4016bca296deb2136a/*    
# https://unix.stackexchange.com/questions/275794/iterating-over-multiple-line-string-stored-in-variable
total=$(echo "$contractDirs" | wc -l)
echo "$contractDirs" | while IFS= read -r contractDir; do
    ((i++)) || true
    echo "==== contract: $i / $total ===="
    if [[ "$i" -lt 0 ]]; then
        continue
    fi

    # if using SKIP, skip if already verified
    if [[ "$SKIP" ]] && [[ -f "$contractDir/metadata.json" ]]; then
        echo "skipping $contractDir"
        continue
    fi

    echo "verifying $contractDir"

    # reset out directory
    rm -rf ./out/* || exit $?
    cp -R $contractDir/* ./out || exit $?

    # extract contract details from copied files
    contractname=$(jq -r .name $CONFIG_FILE) || exit $?
    address=$(jq -r .address $CONFIG_FILE) || exit $?
    chainId=$(jq -r .chainId $CONFIG_FILE) || exit $?
    if [[ "$chainId" == 0x* ]]; then
        # convert chainId hex value to decimal
        chainId=$(echo $chainId \
            | tr '[A-Z]' '[a-z]'                `# lowercase` \
            | sed -E 's/^0x(.*)/ibase=16;\1/'   `# remove ^0x & format for bc as base16` \
            | bc)                               # return decimal value
    fi

    # ensure chainid's match
    if [[ ! "$chainId" == "$CHAIN_ID" ]]; then
        >&2 echo "chainid in $CONFIG_FILE ($chainId) does not match chainid provided ($CHAIN_ID)"
        exit 1
    fi

    if [[ "$VERBOSE" ]]; then echo "name: $contractname"; fi

    # find the required compiler
    compiler=`jq -r .compiler $CONFIG_FILE | cut -c1-23`
    if [[ "$VERBOSE" ]]; then echo "source compiler: $compiler"; fi
    if [[ "$compiler" == *"vyper"* ]]; then
        msg=$(echo "[$(date '+%Y-%m-%d %H:%M:%S')] $(hostname) $contractDir $i $contractname")
        >&2 echo "ERROR: unsupported compiler" "$msg"
        if [[ "$LOG" ]]; then echo "$msg" >> ./state/logs/unsupported.log; fi
        if [[ "$FAIL_FAST" ]]; then exit 1; fi
        continue
    fi

    # download compiler if we don't have it
    COMPILER_FILE="./compilers/solc-$compiler"
    if ! test -f "$COMPILER_FILE"; then
        # TODO: download compiler for architecture
        # download to tmp file in-case process exits while compiler is dling
        # otherwise can be left with a zero-size compiler executable
        compilertmp=$(mktemp)
        wget https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/linux-amd64/solc-linux-amd64-$compiler -q -O $compilertmp
        mv $compilertmp $COMPILER_FILE
    fi
    chmod +x $COMPILER_FILE

    # register use of the compiler
    used=./state/compilers/$chainId.json
    usedtmp=$(mktemp)

    # initialise compilers/$chainId.json
    [[ ! -f "$used" ]] && echo "[]" >> $used
    # append compiler to the list
    usedtmp=$(jq ". |= . + [\"$compiler\"] | unique | sort" $used) || exit $?
    # write new output
    echo "$usedtmp" > $used

    # try to compile
    if [[ "$VERBOSE" ]]; then $COMPILER_FILE --version; fi
    timeout 15s bash -c "cat ./out/input.json \
        | $COMPILER_FILE --standard-json \
        | jq '.' > ./out/output.json";
    exit_status=$?
    if [[ $exit_status -eq 124 ]]; then
        # compilation timed out
        msg=$(echo "[$(date '+%Y-%m-%d %H:%M:%S')] $(hostname) $contractDir $i $contractname")
        >&2 echo "ERROR: timed out" "$msg"
        if [[ "$LOG" ]]; then echo "$msg" >> ./state/logs/timeouts.log; fi
        if [[ "$FAIL_FAST" ]]; then exit 1; fi
        continue
    fi

    # verify using nodejs
    pwd=$(pwd)
    # to use source maps, add flag --enable-source-maps
    nodeargs=( \
        "--file=$pwd/out/output.json" \
        "--name=$contractname" \
        "--chainid=$chainId" \
        "--address=$address" \
        "--out=$pwd/out" \
        "--hashlists.dir=$pwd/state/hashes" \
        "--verifiedlists.dir=$pwd/state/verified" \
    )
    if [[ "" ]]; then nodeargs+=("--enable-source-maps"); fi
    if [[ "$PROVIDER_URI" ]]; then nodeargs+=("--provider-uri=$PROVIDER_URI"); fi
    node ./dist/index.js verify "${nodeargs[@]}"

    exit_status=$?
    if [[ "$exit_status" -ne "0" ]]; then
        # nodejs errored
        msg=$(echo "[$(date '+%Y-%m-%d %H:%M:%S')] $(hostname) $contractDir $i $contractname")
        >&2 echo "ERROR: NodeJS error" "$msg"
        if [[ "$LOG" ]]; then echo "$msg" >> ./state/logs/failed.log; fi
        if [[ "$FAIL_FAST" ]]; then exit 1; fi
        continue
    fi

    if [[ "$SAVE" ]]; then
        # move previous files & new nodejs output back into the contract's directory
        if [[ "$VERBOSE" ]]; then
            echo "saving results ./out/metadata.json to $contractDir/metadata.json";
        fi
        mv ./out/metadata.json $contractDir/metadata.json
    fi
done

# # echo $abc
# #./out/solc --bin-runtime ./out/sourcecode.sol --optimize --optimize-runs=200 -o ./out/runtime --overwrite --evm-version
