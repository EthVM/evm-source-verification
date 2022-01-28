docker build --no-cache -t lambda-solidity-compiler .
AWS_PROFILE=serverless AWS_DEFAULT_REGION=us-west-2 aws ecr create-repository --repository-name lambda-solidity-compiler --image-scanning-configuration scanOnPush=true
docker tag lambda-solidity-compiler:latest 453490899549.dkr.ecr.us-west-2.amazonaws.com/lambda-solidity-compiler:latest
AWS_PROFILE=serverless AWS_DEFAULT_REGION=us-west-2 aws ecr get-login-password | docker login --username AWS --password-stdin 453490899549.dkr.ecr.us-west-2.amazonaws.com
docker push 453490899549.dkr.ecr.us-west-2.amazonaws.com/lambda-solidity-compiler:latest

after changes
docker build --no-cache -t lambda-solidity-compiler .
docker tag lambda-solidity-compiler:latest 453490899549.dkr.ecr.us-west-2.amazonaws.com/lambda-solidity-compiler:latest
docker push 453490899549.dkr.ecr.us-west-2.amazonaws.com/lambda-solidity-compiler:latest

run locally
docker build -t lambda-container-demo . && docker run -p 9000:8080 lambda-container-demo:latest

http://localhost:9000/2015-03-31/functions/function/invocations
