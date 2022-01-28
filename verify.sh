#!/usr/bin/env bash

# https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425
# -u: no unknown vars
# -o pipefail: don't hide pipe errs
set -uo pipefail

CONFIG_FILE=out/configs.json

# https://stackoverflow.com/questions/192249/how-do-i-parse-command-line-arguments-in-bash
# skip contracts that have already been verified (already have a metadata.json file)
SKIP=false
BUILD=false
CLEAN=false
for i in "$@"; do
    case $i in
        # skip contracts that have already been verified (have a metadata.json file)
        -s=*|--skip=*)
            SKIP="${i#*=}";
            shift;
            ;;

        # build before executing
        -b=*|--build=*)
            BUILD="${i#*=}";
            shift;
            ;;

        # build before executing
        -c=*|--clean=*)
            CLEAN="${i#*=}";
            shift;
            ;;

        -*|--*)
            echo "unknown option $i";
            exit 1;
            ;;
    esac
done

# delete all metadata and state for a fresh start
if [ "$CLEAN" == "true" ]; then
    # get confirmation
    read -r -p "Are you sure you want to delete all metadata and state? [y/n] " response
    case "$response" in
        [yY])
            echo "removing ./contracts/*/*/metadata.json"
            find ./contracts/*/*/ -type f -name "metadata.json" -exec rm {} +
            echo "removing ./state"
            rm -rf ./state
            echo "finished cleaning"
            ;;
        *)
            echo "exiting"
            exit 1
            ;;
    esac
    rm -rf state
fi

# build the project
if [ "$BUILD" == "true" ]; then
    # (it's fast with tsconfig.json#compilerOptions#incremental)
    echo "building"
    npm run build
    if [[ $? -ne 0 ]]; then exit 1; fi
fi

mkdir -p ./out
mkdir -p ./compilers
mkdir -p ./state
mkdir -p ./state/compilers
mkdir -p ./state/logs

i=0
# dir=contracts/1/0x0131b36ad41b041db46ded4016bca296deb2136a/*    
for dir in contracts/1/*
do
    echo "==== counter: $i ===="
    ((i++)) || true
    if [[ "$i" -lt 0 ]]; then
        continue
    fi

    # if using SKIP, skip if already verified
    if [[ (("$SKIP" == "true")) && (( -f "$dir/metadata.json" )) ]]; then
        echo "skipping $dir"
        continue
    fi

    echo "verifying ${dir}"

    # reset out directory
    rm -rf ./out/*
    cp -R $dir/* ./out

    # extract contract details from copied files
    contractname=`jq -r .name $CONFIG_FILE`
    address=`jq -r .address $CONFIG_FILE`
    chainId=`jq -r .chainId $CONFIG_FILE`
    if [[ "$chainId" == 0x* ]]; then
        # convert chainId hex value to decimal
        # TODO: does this sed work on mac?
        chainId=$(echo $chainId \
            | tr '[A-Z]' '[a-z]'                `# lowercase` \
            | sed -E 's/^0x(.*)/ibase=16;\1/'   `# remove ^0x & format for bc as base16` \
            | bc)                               # return decimal value
    fi

    echo $contractname

    # find the required compiler
    compiler=`jq -r .compiler $CONFIG_FILE | cut -c1-23`
    echo "source compiler: $compiler"
    if [[ "$compiler" == *"vyper"* ]]; then
        echo "unsupported compiler"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $(hostname) $dir $i $contractname" >> ./state/logs/unsupported.log
        continue
    fi

    # download compiler if we don't have it
    COMPILER_FILE="./compilers/solc-$compiler"
    if ! test -f "$COMPILER_FILE"; then
        # todo: download compiler for architecture
        wget https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/linux-amd64/solc-linux-amd64-$compiler -q -O $COMPILER_FILE
        chmod +x $COMPILER_FILE
    fi

    # register use of the compiler
    used=./state/compilers/$chainId.json
    usedtmp=/tmp/compilers_$RANDOM.json;

    # initialise compilers/$chainId.json
    [[ ! -f "$used" ]] && echo "[]" >> $used

    # append compiler to the list
    jq ". |= . + [\"$compiler\"] | unique | sort" $used > $usedtmp
    [[ ! $? -eq "0" ]] && exit 1
    mv $usedtmp $used

    # try to compile
    $COMPILER_FILE --version
    timeout 15s bash -c "cat ./out/input.json \
        | $COMPILER_FILE --standard-json \
        | jq '.' > ./out/output.json";
    exit_status=$?
    if [[ $exit_status -eq 124 ]]; then
        # compilation timed out
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $(hostname) $dir $i $contractname" >> ./state/logs/timeouts.log
        continue
    fi

    # verify using nodejs
    pwd=`pwd`
    # to use source maps, add flag --enable-source-maps after `node`
    node ./dist/src/index.js verify \
        --file $pwd/out/output.json \
        --name $contractname \
        --chainid $chainId \
        --enable-source-maps \
        --address $address \
        --out $pwd/out \
        --hashlists.dir $pwd/state/hashes \
        --verifiedlists.dir $pwd/state/verified;

    if [[ $? -ne 0 ]]; then
        # nodejs errored
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $(hostname) $dir $i $contractname" >> ./state/logs/failed.log
        continue
    fi

    # move previous files & new nodejs output back into the contract's directory
    echo "coping ./out/* to $dir/";
    # do not copy the compiled file
    rm ./out/output.json
    mv ./out/* $dir/
done
# # echo $abc
# #./out/solc --bin-runtime ./out/sourcecode.sol --optimize --optimize-runs=200 -o ./out/runtime --overwrite --evm-version

