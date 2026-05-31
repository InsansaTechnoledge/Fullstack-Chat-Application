const { docClient, MESSAGES_TABLE } = require("../config/dynamodb");
const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const Message = {
  // Find messages between two users
  find: (queryObj) => {
    return {
      sort: async (sortObj) => {
        // QueryObj shape: { users: { $all: [from, to] } }
        const users = queryObj.users?.$all;
        if (!users || users.length < 2) {
          throw new Error("Invalid query for messages");
        }
        const [from, to] = users;
        // Generate the partition key chatId by sorting the user IDs
        const chatId = [from, to].sort().join("#");

        const params = {
          TableName: MESSAGES_TABLE,
          KeyConditionExpression: "chatId = :chatId",
          ExpressionAttributeValues: {
            ":chatId": chatId,
          },
        };

        const result = await docClient.send(new QueryCommand(params));
        // Sort Key is createdAt (ISO 8601 string), which naturally sorts chronologically.
        // If sortObj has { updatedAt: 1 } or similar, DynamoDB Query naturally returns items
        // sorted by the Sort Key (createdAt) in ascending order.
        // We reconstruct the MongoDB Message schema structure so controller maps it correctly
        const items = result.Items || [];
        return items.map(item => ({
          _id: item._id,
          message: { text: item.messageText },
          users: item.users,
          sender: item.sender,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));
      }
    };
  },

  // Create a new message
  create: async (msgData) => {
    const [from, to] = msgData.users;
    const chatId = [from, to].sort().join("#");
    const now = new Date().toISOString();

    const newMessage = {
      _id: crypto.randomUUID(),
      chatId: chatId,
      createdAt: now,
      updatedAt: now,
      sender: msgData.sender,
      messageText: msgData.message.text,
      users: msgData.users,
    };

    await docClient.send(
      new PutCommand({
        TableName: MESSAGES_TABLE,
        Item: newMessage,
      })
    );
    return newMessage;
  }
};

module.exports = Message;
