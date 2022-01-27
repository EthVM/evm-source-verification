#!/bin/bash

# https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425
# -u: no unknown vars
# -o pipefail: don't hide pipe errs
set -ueo pipefail

CONFIG_FILE=out/configs.json

mkdir -p ./out
mkdir -p ./compilers

# https://stackoverflow.com/questions/192249/how-do-i-parse-command-line-arguments-in-bash
# skip contracts that have already been verified (already have a metadata.json file)
SKIP=false
for i in "$@"; do
    case $i in
        -s=*|--skip=*)
            SKIP="${i#*=}";
            shift;
            ;;
        -*|--*)
            echo "unknown option $i";
            exit 1;
            ;;
    esac
done

i=0
# dir=contracts/1/0x0131b36ad41b041db46ded4016bca296deb2136a/*    
for dir in contracts/1/*
do
    echo "==== counter: $i ===="
    ((i++)) || true
    if [[ "$i" -lt 0 ]]; then
        continue
    fi

    # is already verified?
    if [[ -f "$dir/metadata.json" ]]; then
        if [[ "$SKIP" == "true" ]]
        then echo "skipping $dir"; continue;
        else echo "re-verifying $dir";
        fi
    fi

    echo "verifying ${dir}"

    # reset out directory
    rm -rf ./out/*
    cp -R $dir/* ./out

    # find the required compiler
    compiler=`jq -r .compiler $CONFIG_FILE | cut -c1-23`
    echo "source compiler: $compiler"
    if [[ "$compiler" == *"vyper"* ]]; then
        mkdir -p logs
        echo "unsupported compiler"
        echo "$dir $i" >> logs/unsupported
        continue
    fi

    # download compiler if we don't have it
    COMPILER_FILE="./compilers/solc-$compiler"
    if ! test -f "$COMPILER_FILE"; then
        # todo: download compiler for architecture
        wget https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/linux-amd64/solc-linux-amd64-$compiler -q -O $COMPILER_FILE
        chmod +x $COMPILER_FILE
    fi

    # try to compile
    $COMPILER_FILE --version
    timeout 15s bash -c "cat ./out/input.json \
        | $COMPILER_FILE --standard-json \
        | jq '.' > ./out/output.json";
    exit_status=$?
    if [[ $exit_status -eq 124 ]]; then
        echo "$dir $i" >> timeouts
        continue
    fi

    # verify using nodejs
    contractname=`jq -r .name $CONFIG_FILE`
    address=`jq -r .address $CONFIG_FILE`
    chainId=`jq -r .chainId $CONFIG_FILE`
    echo $contractname
    pwd=`pwd`

    # to use source maps, add flag --enable-source-maps after `node`
    node ./dist/src/index.js verify \
        --file $pwd/out/output.json \
        --name $contractname \
        --chainid $chainId \
        --enable-source-maps \
        --address $address \
        --out $pwd/out;

    #  nodejs errored?
    if [[ $? -ne 0 ]]; then
        # failed
        mkdir -p logs
        echo "$dir $i $address $contractname" >> logs/failed
        continue
    fi

    # move previous files & new nodejs output back into the contract's directory
    echo "coping ./out/* to $dir/";

    mv ./out/* $dir/
done
# # echo $abc
# #./out/solc --bin-runtime ./out/sourcecode.sol --optimize --optimize-runs=200 -o ./out/runtime --overwrite --evm-version

