# Lambda container for Solidiy compiling

This let users compile solidity standard input file online without needing to download any binary files

This container is based on the tutorial provided at https://aripalo.com/blog/2020/aws-lambda-container-image-support/

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



after changes
docker build --no-cache -t lambda-solidity-compiler .
docker tag lambda-solidity-compiler:latest 453490899549.dkr.ecr.us-west-2.amazonaws.com/lambda-solidity-compiler:latest
docker push 453490899549.dkr.ecr.us-west-2.amazonaws.com/lambda-solidity-compiler:latest

run locally
docker build -t lambda-container-demo . && docker run -p 9000:8080 lambda-container-demo:latest

http://localhost:9000/2015-03-31/functions/function/invocations

curl -d @input.json -H 'Content-Type: application/json' https://0klkvk58y4.execute-api.us-west-2.amazonaws.com/default/solidity-compiler?compiler=v0.8.11+commit.d7f03943
