const { DynamoDBClient, CreateTableCommand, ListTablesCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
require("dotenv").config();

const region = process.env.AWS_REGION || "us-east-1";
const endpoint = process.env.DYNAMODB_ENDPOINT || undefined;

const clientConfig = {
  region,
};

if (endpoint) {
  clientConfig.endpoint = endpoint;
  // If connecting to local DynamoDB, use dummy credentials to prevent AWS SDK from throwing auth error
  clientConfig.credentials = {
    accessKeyId: "local",
    secretAccessKey: "local",
  };
} else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  // Explicitly pass credentials from process.env if provided (e.g. via .env file)
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const dynamoClient = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "Users";
const MESSAGES_TABLE = process.env.DYNAMODB_MESSAGES_TABLE || "Messages";

async function waitForTableActive(tableName) {
  console.log(`Waiting for table ${tableName} to become ACTIVE...`);
  while (true) {
    try {
      const { Table } = await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
      if (Table && Table.TableStatus === "ACTIVE") {
        console.log(`Table ${tableName} is now ACTIVE.`);
        break;
      }
    } catch (err) {
      console.log(`Error describing table ${tableName}, retrying...`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function initDB() {
  try {
    console.log("Checking DynamoDB connection and tables...");
    const { TableNames } = await dynamoClient.send(new ListTablesCommand({}));
    
    let createdUsers = false;
    let createdMessages = false;

    // Create Users Table if it doesn't exist
    if (!TableNames.includes(USERS_TABLE)) {
      console.log(`Creating DynamoDB table: ${USERS_TABLE}...`);
      await dynamoClient.send(
        new CreateTableCommand({
          TableName: USERS_TABLE,
          AttributeDefinitions: [
            { AttributeName: "_id", AttributeType: "S" },
            { AttributeName: "username", AttributeType: "S" },
            { AttributeName: "email", AttributeType: "S" },
          ],
          KeySchema: [{ AttributeName: "_id", KeyType: "HASH" }],
          GlobalSecondaryIndexes: [
            {
              IndexName: "username-index",
              KeySchema: [{ AttributeName: "username", KeyType: "HASH" }],
              Projection: { ProjectionType: "ALL" },
            },
            {
              IndexName: "email-index",
              KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
              Projection: { ProjectionType: "ALL" },
            },
          ],
          BillingMode: "PAY_PER_REQUEST",
        })
      );
      createdUsers = true;
      console.log(`Table ${USERS_TABLE} creation initiated successfully.`);
    } else {
      console.log(`Table ${USERS_TABLE} already exists.`);
    }

    // Create Messages Table if it doesn't exist
    if (!TableNames.includes(MESSAGES_TABLE)) {
      console.log(`Creating DynamoDB table: ${MESSAGES_TABLE}...`);
      await dynamoClient.send(
        new CreateTableCommand({
          TableName: MESSAGES_TABLE,
          AttributeDefinitions: [
            { AttributeName: "chatId", AttributeType: "S" },
            { AttributeName: "createdAt", AttributeType: "S" },
          ],
          KeySchema: [
            { AttributeName: "chatId", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          BillingMode: "PAY_PER_REQUEST",
        })
      );
      createdMessages = true;
      console.log(`Table ${MESSAGES_TABLE} creation initiated successfully.`);
    } else {
      console.log(`Table ${MESSAGES_TABLE} already exists.`);
    }

    // Wait for tables to become ACTIVE if we created them
    if (createdUsers) {
      await waitForTableActive(USERS_TABLE);
    }
    if (createdMessages) {
      await waitForTableActive(MESSAGES_TABLE);
    }

    console.log("DynamoDB initialization complete.");
  } catch (error) {
    console.error("Error initializing DynamoDB tables:", error);
    throw error;
  }
}

module.exports = {
  dynamoClient,
  docClient,
  initDB,
  USERS_TABLE,
  MESSAGES_TABLE,
};
