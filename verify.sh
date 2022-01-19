#!/bin/bash

CONFIG_FILE=out/configs.json
mkdir ./out
for dir in contracts/1/*/
do
    dir=$dir*    
    echo "${dir}"
    rm -rf ./out/*
    cp -R $dir ./out
    compiler=`jq -r .compiler $CONFIG_FILE | cut -c2-23`
    echo "source compiler: $compiler"
    wget https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/linux-amd64/solc-linux-amd64-v$compiler -q -O ./out/solc
    chmod +x ./out/solc
    ./out/solc --version
    ./out/solc --standard-json ./out/input.json | jq '.' > ./out/output.json
    contractname=`jq -r .name $CONFIG_FILE`
    address=`jq -r .address $CONFIG_FILE`
    chainid=`jq -r .chainId $CONFIG_FILE`
    echo $contractname
    $CMD
    #npm run build
    pwd=`pwd`
    abc="node ./dist/src/index.js verify --file $pwd/out/output.json --mode standard-json --name $contractname --chainid $chainId --address $address"
    $abc
done
# # echo $abc
# #./out/solc --bin-runtime ./out/sourcecode.sol --optimize --optimize-runs=200 -o ./out/runtime --overwrite --evm-version

