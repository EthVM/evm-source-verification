#!/bin/bash

CONFIG_FILE=out/configs.json
mkdir ./out
rm -rf ./out/*
cp -R contracts/1/0x0a0c7c7d8faa70e6d88aab1663b40da88115c228/* ./out
compiler=`jq -r .compiler $CONFIG_FILE | cut -c2-23`
echo "source compiler: $compiler"
wget https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/linux-amd64/solc-linux-amd64-v$compiler -O ./out/solc
chmod +x ./out/solc
./out/solc --version
MODE=`jq -r .inputType $CONFIG_FILE`

if [ $MODE = "standard-json" ]
then
    ./out/solc --standard-json ./out/metadata.json > ./out/output.json
elif [ $MODE = 'one-file']
then
    CMD="./out/solc --bin-runtime ./out/sourcecode.sol"

    optimization=`jq .optimization $CONFIG_FILE`
    if [ $optimization = "true" ]
    then
        runs=`jq .runs $CONFIG_FILE`
        CMD="$CMD --optimize --optimize-runs=$runs"
    fi

    evmversion=`jq -r .evmVersion $CONFIG_FILE`
    if [ $evmversion != 'default' ]
    then
        CMD="$CMD --evm-version=$evmversion"
    fi

    CMD="$CMD -o ./out/runtime --overwrite"
else
 echo "Unknown mode"
 exit 1
fi

contractname=`jq -r .name $CONFIG_FILE`
address=`jq -r .address $CONFIG_FILE`
chainid=`jq -r .chainId $CONFIG_FILE`
echo $contractname
$CMD
#npm run build
pwd=`pwd`
if [ $MODE = "standard-json" ]
then
    abc="node dist/src/index.js verify --file $pwd/out/output.json --mode standard-json --name $contractname --chainid $chainId --address $address"
    echo $abc
else
    abc="node dist/src/index.js verify --file $pwd/out/runtime/$contractname.bin-runtime --mode single-file --name $contractname --chainid $chainId --address $address"
    echo $abc
fi
# # echo $abc
# #./out/solc --bin-runtime ./out/sourcecode.sol --optimize --optimize-runs=200 -o ./out/runtime --overwrite --evm-version

