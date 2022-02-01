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
    echo "usage: $programName"
    echo "  -h --help     [false]   print the usage documentation of this"
    echo "                          program"
    echo "  -v --verbose  [false]   print debug logs"
    echo "  -s --skip     [false]   skip contracts who already have metadata"
    echo "  -b --build    [false]   build the NodeJS app before verifying"
    echo "  -c --clean    [false]   delete all previous metadata and state from"
    echo "                          target directories before verifying"
    echo "  -f --failfast [false]   exit on first failure"
    echo "  -a --save     [false]   save validation results"
    echo "  -l --log      [false]   store failure log outputs"
    echo "  -d --dirs     [contracts/chainid/*] contract directories to"
    echo "                          validate"
    echo "  -c --chainid  [1]       id of the chain"
    exit $1 || "0";
}

function indent {
    if [[ "$1" ]]; then echo "$1" | sed -E 's/(.*)/    \1/'; fi
}

CONFIG_FILE="out/configs.json"

VERBOSE=
SKIP=
BUILD=
CLEAN=
FAIL_FAST=
SAVE=
LOG=
DIRS=
CHAIN_ID="1"
for i in "$@"; do
    case $i in
        -h|--help)
            echo "help:"
            usage 0
            shift
            ;;

        -v|--verbose)
            VERBOSE="true"
            shift;
            ;;

        -s|--skip)
            SKIP="true";
            shift;
            ;;

        -b|--build)
            BUILD="true";
            shift;
            ;;

        -c|--clean)
            CLEAN="true";
            shift;
            ;;

        -a|--save)
            SAVE="true";
            shift;
            ;;

        -l|--log)
            LOG="true";
            shift;
            ;;

        -f|--failfast)
            FAIL_FAST="true";
            shift;
            ;;

        -d=*|--dirs=*)
            DIRS="${i#*=}";
            shift;
            ;;

        -c=*|--chainid=*)
            CHAIN_ID="${i#*=}";
            shift;
            ;;

        -*|--*)
            echo "ERROR: unknown option \"$i\"";
            exit 1;
            ;;
    esac
done

# try to load dirs if not given in args
if [[ ! "$DIRS" ]]; then
  if [[ ! -t 0 ]]; then
    # read from stdin if it's not open (ie terminal is not interactive, we've
    # probably received a pipe)
    # https://stackoverflow.com/questions/911168/how-can-i-detect-if-my-shell-script-is-running-through-a-pipe/911213#911213
    if [[ "$VERBOSE" ]]; then echo "loading DIRS from stdin"; fi
    DIRS=$(cat)
  else
    # no pipe, load directly from contract dirs
    if [[ "$VERBOSE" ]]; then echo "loading DIRS from filesystem"; fi
    DIRS=$(find contracts/"$CHAIN_ID"/ -mindepth 1 -maxdepth 1)
  fi
fi

# delete all metadata and state for a fresh start
if [[ "$CLEAN" ]]; then
    # get the metadata files being deleted
    echo "loading files to clean..."
    # TODO: this takes some time because it executes find on every directory
    #       should speed it up
    rmFiles=$(echo "$DIRS" | xargs -I {} find {} -type f -name "metadata.json")
    rmCount=$(echo "$rmFiles" | wc -l)
    contractCount=$(echo "$DIRS" | wc -l)

    echo "$DIRS"
    echo "$rmFiles"
    echo "$rmCount"
    echo "$contractCount"
    echo "fuck"
    exit 1

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

# create necessary directories
mkdir -p "./out"
mkdir -p "./compilers"
mkdir -p "./state"
mkdir -p "./state/compilers"
mkdir -p "./state/logs"

i=0
# dir=contracts/1/0x0131b36ad41b041db46ded4016bca296deb2136a/*    
# https://unix.stackexchange.com/questions/275794/iterating-over-multiple-line-string-stored-in-variable
total=$(echo "$DIRS" | wc -l)
echo "$DIRS" | while IFS= read -r dir; do
    ((i++)) || true
    echo "==== contract: $i / $total ===="
    if [[ "$i" -lt 0 ]]; then
        continue
    fi

    # if using SKIP, skip if already verified
    if [[ "$SKIP" ]] && [[ -f "$dir/metadata.json" ]]; then
        echo "skipping $dir"
        continue
    fi

    echo "verifying $dir"

    # reset out directory
    rm -rf ./out/* || exit $?
    cp -R $dir/* ./out || exit $?

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
        echo "chainid in $CONFIG_FILE ($chainId) does not match chainid provided ($CHAIN_ID)"
        exit 1
    fi

    echo $contractname

    # find the required compiler
    compiler=`jq -r .compiler $CONFIG_FILE | cut -c1-23`
    echo "source compiler: $compiler"
    if [[ "$compiler" == *"vyper"* ]]; then
        msg=$(echo "[$(date '+%Y-%m-%d %H:%M:%S')] $(hostname) $dir $i $contractname")
        echo "unsupported compiler" "$msg"
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
    $COMPILER_FILE --version
    timeout 15s bash -c "cat ./out/input.json \
        | $COMPILER_FILE --standard-json \
        | jq '.' > ./out/output.json";
    exit_status=$?
    if [[ $exit_status -eq 124 ]]; then
        # compilation timed out
        msg=$(echo "[$(date '+%Y-%m-%d %H:%M:%S')] $(hostname) $dir $i $contractname")
        echo "timed out" "$msg"
        if [[ "$LOG" ]]; then echo "$msg" >> ./state/logs/timeouts.log; fi
        if [[ "$FAIL_FAST" ]]; then exit 1; fi
        continue
    fi

    # verify using nodejs
    pwd=$(pwd)
    # to use source maps, add flag --enable-source-maps after `node`
    # node ./dist/src/index.js verify \
    node ./dist/index.js verify \
        --file $pwd/out/output.json \
        --name $contractname \
        --chainid $chainId \
        --enable-source-maps \
        --address $address \
        --out $pwd/out \
        --hashlists.dir $pwd/state/hashes \
        --verifiedlists.dir $pwd/state/verified;

    exit_status=$?
    if [[ "$exit_status" -ne "0" ]]; then
        # nodejs errored
        msg=$(echo "[$(date '+%Y-%m-%d %H:%M:%S')] $(hostname) $dir $i $contractname")
        echo "NodeJS errored" "$msg"
        if [[ "$LOG" ]]; then echo "$msg" >> ./state/logs/failed.log; fi
        if [[ "$FAIL_FAST" ]]; then exit 1; fi
        continue
    fi

    if [[ "$SAVE" ]]; then
        # move previous files & new nodejs output back into the contract's directory
        echo "saving results ./out/metadata.json to $dir/metadata.json";
        mv ./out/metadata.json $dir/metadata.json
    fi
done

# # echo $abc
# #./out/solc --bin-runtime ./out/sourcecode.sol --optimize --optimize-runs=200 -o ./out/runtime --overwrite --evm-version
