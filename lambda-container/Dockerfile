FROM amazon/aws-lambda-provided:al2

# Copy our bootstrap and make it executable
WORKDIR /var/runtime/
COPY bootstrap bootstrap
RUN chmod 755 bootstrap

# Copy our function code and make it executable
WORKDIR /var/task/
COPY compiler.sh compiler.sh
COPY jq jq
RUN chmod 755 compiler.sh
RUN chmod 755 jq

# Set the handler
# by convention <fileName>.<handlerName>
CMD [ "compiler.sh.handler" ]