#!/bin/bash
CONFIG_FILE=out/configs.json
mkdir ./out
i=0
for dir in contracts/1/*/
do
    echo "counter: $i"
    ((i++))
    if [[ "$i" -lt 0 ]]; then
       continue
    fi
    dir=$dir*
    # dir=contracts/1/0x15813463b10ec10ad3db7a4a32d91ae9195622a8/*    
    echo "${dir}"
    rm -rf ./out/*
    cp -R $dir ./out
    compiler=`jq -r .compiler $CONFIG_FILE | cut -c1-23`
    echo "source compiler: $compiler"
    if [[ "$compiler" == *"vyper"* ]]; then
        echo "unsupported compiler"
        echo "$dir $i" >> unsupported
        continue
    fi
    wget https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/linux-amd64/solc-linux-amd64-$compiler -q -O ./out/solc
    chmod +x ./out/solc
    ./out/solc --version
    timeout 15s bash -c "cat ./out/input.json | ./out/solc --standard-json | jq '.' > ./out/output.json"
    exit_status=$?
    if [[ $exit_status -eq 124 ]]; then
        echo "$dir $i" >> timeouts
        continue
    fi
    contractname=`jq -r .name $CONFIG_FILE`
    address=`jq -r .address $CONFIG_FILE`
    chainid=`jq -r .chainId $CONFIG_FILE`
    echo $contractname
    $CMD
    #npm run build
    pwd=`pwd`
    abc="node ./dist/src/index.js verify --file $pwd/out/output.json --name $contractname --chainid $chainId --address $address"
    if ! $abc; 
    then
        echo "$dir $i" >> failed
        continue
    fi
done
# # echo $abc
# #./out/solc --bin-runtime ./out/sourcecode.sol --optimize --optimize-runs=200 -o ./out/runtime --overwrite --evm-version

