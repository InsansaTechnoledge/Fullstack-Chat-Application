#!/bin/bash

# Configuration (defaults can be overridden by environment variables)
REGION=${AWS_REGION:-"us-east-1"}
USERS_TABLE=${DYNAMODB_USERS_TABLE:-"Users"}
MESSAGES_TABLE=${DYNAMODB_MESSAGES_TABLE:-"Messages"}

echo "Initializing DynamoDB tables in region: $REGION"

# 1. Create Users Table
echo "Creating table: $USERS_TABLE..."
aws dynamodb create-table \
    --table-name "$USERS_TABLE" \
    --attribute-definitions \
        AttributeName=_id,AttributeType=S \
        AttributeName=username,AttributeType=S \
        AttributeName=email,AttributeType=S \
    --key-schema \
        AttributeName=_id,KeyType=HASH \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"username-index\",
                \"KeySchema\": [{\"AttributeName\":\"username\",\"KeyType\":\"HASH\"}],
                \"Projection\": {\"ProjectionType\":\"ALL\"}
            },
            {
                \"IndexName\": \"email-index\",
                \"KeySchema\": [{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],
                \"Projection\": {\"ProjectionType\":\"ALL\"}
            }
        ]" \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION"

# 2. Create Messages Table
echo "Creating table: $MESSAGES_TABLE..."
aws dynamodb create-table \
    --table-name "$MESSAGES_TABLE" \
    --attribute-definitions \
        AttributeName=chatId,AttributeType=S \
        AttributeName=createdAt,AttributeType=S \
    --key-schema \
        AttributeName=chatId,KeyType=HASH \
        AttributeName=createdAt,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION"

echo "---------------------------------------------------------"
echo "Waiting for tables to be created and become ACTIVE..."
echo "---------------------------------------------------------"
aws dynamodb wait table-exists --table-name "$USERS_TABLE" --region "$REGION"
aws dynamodb wait table-exists --table-name "$MESSAGES_TABLE" --region "$REGION"

echo "DynamoDB tables successfully initialized and active!"
