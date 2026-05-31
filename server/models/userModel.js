const { docClient, USERS_TABLE } = require("../config/dynamodb");
const { PutCommand, QueryCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const User = {
  // Find a single user by criteria: e.g. { username } or { email } or { _id }
  findOne: async (queryObj) => {
    const entries = Object.entries(queryObj);
    if (entries.length === 0) return null;
    
    const [key, value] = entries[0];
    if (key === "_id") {
      // Find by ID directly
      const result = await docClient.send(
        new QueryCommand({
          TableName: USERS_TABLE,
          KeyConditionExpression: "_id = :id",
          ExpressionAttributeValues: { ":id": value },
        })
      );
      return result.Items?.[0] || null;
    }
    
    // Find by GSI
    const indexName = `${key}-index`;
    const result = await docClient.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: indexName,
        KeyConditionExpression: `#${key} = :value`,
        ExpressionAttributeNames: { [`#${key}`]: key },
        ExpressionAttributeValues: { ":value": value },
      })
    );
    return result.Items?.[0] || null;
  },

  // Create a new user
  create: async (userData) => {
    const newUser = {
      _id: crypto.randomUUID(),
      username: userData.username,
      email: userData.email,
      password: userData.password,
      isAvatarImageSet: false,
      avatarImage: "",
    };

    await docClient.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: newUser,
      })
    );
    return newUser;
  },

  // Find all users (excluding current user ID) and selecting fields
  find: (queryObj) => {
    return {
      select: async (fieldsArray) => {
        // Since DynamoDB scan is needed for "all users", we will scan the table.
        // We filter out the user with _id = queryObj._id.$ne if applicable.
        const neId = queryObj._id?.$ne;
        
        const params = {
          TableName: USERS_TABLE,
        };
        
        if (neId) {
          params.FilterExpression = "#id <> :neId";
          params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
          params.ExpressionAttributeNames["#id"] = "_id";
          params.ExpressionAttributeValues = { ":neId": neId };
        }
        
        if (fieldsArray && fieldsArray.length > 0) {
          // Map mongoose fields to DynamoDB ProjectionExpression
          // Note: "username" can be a reserved keyword in DynamoDB, so we should use ExpressionAttributeNames if necessary.
          // To be 100% safe, let's use ProjectionExpression with ExpressionAttributeNames.
          params.ProjectionExpression = fieldsArray.map(f => `#${f}`).join(", ");
          params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
          fieldsArray.forEach(f => {
            params.ExpressionAttributeNames[`#${f}`] = f;
          });
        }

        const result = await docClient.send(new ScanCommand(params));
        return result.Items || [];
      }
    };
  },

  // Find by ID and update avatar details
  findByIdAndUpdate: async (userId, updateFields, options) => {
    const { isAvatarImageSet, avatarImage } = updateFields;
    const params = {
      TableName: USERS_TABLE,
      Key: { _id: userId },
      UpdateExpression: "SET isAvatarImageSet = :isAvatarImageSet, avatarImage = :avatarImage",
      ExpressionAttributeValues: {
        ":isAvatarImageSet": isAvatarImageSet,
        ":avatarImage": avatarImage,
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await docClient.send(new UpdateCommand(params));
    return result.Attributes;
  }
};

module.exports = User;
