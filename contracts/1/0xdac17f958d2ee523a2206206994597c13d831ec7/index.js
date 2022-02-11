import { GraphQLClient, gql } from "graphql-request";
import fs from "fs";
const graphQLClient = new GraphQLClient("https://api.ethvm.com");
const mutation = gql`
  mutation verifyContract($contractData: String!) {
    verifyContract(contractData: $contractData) {
      error
      status
      url
    }
  }
`;

const contractData = {
  configs: JSON.parse(fs.readFileSync("./configs.json", { encoding: "utf8" })),
  input: JSON.parse(fs.readFileSync("./input.json", { encoding: "utf8" })),
};
const variables = {
  contractData: JSON.stringify(contractData),
};
graphQLClient.request(mutation, variables).then((data) => {
  console.log(JSON.stringify(data, undefined, 2));
});
