# Lambda container for Solidiy compiling

This let users compile solidity standard input file online without needing to download any binary files

This container is based on the tutorial provided at https://aripalo.com/blog/2020/aws-lambda-container-image-support/

Currently api end point is located at `https://solc.ethvm.com`

```sh
curl -d @input.json -H 'Content-Type: application/json' https://solc.ethvm.com/?compiler=v0.8.2+commit.661d1103
```
replace `v0.8.2+commit.661d1103` to your desired compiler and `@input.json` file is the [solidity standard input](https://docs.soliditylang.org/en/v0.8.10/using-the-compiler.html#compiler-input-and-output-json-description)

## Building
This will build the docker container

```sh
docker build -t lambda-solidity-compiler .
```

## Run locally
This will build and run the container locally

```sh
docker build -t lambda-solidity-compiler . && docker run -p 9000:8080 lambda-solidity-compiler:latest
```

you can post input file local container as follows
```sh
curl -d @sample-gateway-input.json -H 'Content-Type: application/json' http://localhost:9000/2015-03-31/functions/function/invocations
```
however since the local invocation doesnt come from aws api gateway you have to change the input to follow gateway input, use the `sample-gateway-input.json` as an example

## Deploying to ECR
This will create and deploy the container to AWS ECR

```sh
docker build --no-cache -t lambda-solidity-compiler .

AWS_PROFILE=serverless AWS_DEFAULT_REGION=us-west-2 aws ecr create-repository --repository-name lambda-solidity-compiler --image-scanning-configuration scanOnPush=true

docker tag lambda-solidity-compiler:latest 453490899549.dkr.ecr.us-west-2.amazonaws.com/lambda-solidity-compiler:latest

AWS_PROFILE=serverless AWS_DEFAULT_REGION=us-west-2 aws ecr get-login-password | docker login --username AWS --password-stdin 453490899549.dkr.ecr.us-west-2.amazonaws.com
docker push 453490899549.dkr.ecr.us-west-2.amazonaws.com/lambda-solidity-compiler:latest
```
replace `AWS_PROFILE, AWS_DEFAULT_REGION` your values then replace `us-west-2` to your region and `453490899549` to your acount id

## Redeploying after changes
This will build and rand redeploy

```sh
docker build --no-cache -t lambda-solidity-compiler .

docker tag lambda-solidity-compiler:latest 453490899549.dkr.ecr.us-west-2.amazonaws.com/lambda-solidity-compiler:latest
docker push 453490899549.dkr.ecr.us-west-2.amazonaws.com/lambda-solidity-compiler:latest
```
