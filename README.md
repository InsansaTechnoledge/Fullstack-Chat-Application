# Evalvo - Chat Application 
EvalvoChat is a chat application built with the power of React, Node.js, and DynamoDB.

## Installation Guide

### Requirements
- [Nodejs](https://nodejs.org/en/download)
- **DynamoDB**: You can run Amazon DynamoDB locally (using Docker or the downloadable version) or use a cloud-hosted Amazon DynamoDB instance.

### Installation

#### First Method (Manual Installation)
```shell
git clone https://github.com/harshvaidya04/Chat-App-Fullstack
cd Chat-App-Fullstack
```
Now rename env files from `.env.example` to `.env`
```shell
cd public
mv .env.example .env
cd ..
cd server
mv .env.example .env
cd ..
```

Now install the dependencies:
```shell
cd server
npm install
cd ..
cd public
npm install
```

##### Starting DynamoDB Local
To run the database locally without AWS credentials, you can spin up DynamoDB Local using Docker:
```shell
docker run -d -p 8000:8000 amazon/dynamodb-local -jar DynamoDBLocal.jar -inMemory
```

Now start the development servers:

For Frontend:
```shell
cd public
npm start
```

For Backend:
Open another terminal, ensure DynamoDB Local is running on port 8000, and run:
```shell
cd server
npm start
```
Done! Now open `http://localhost:3000` in your browser.

#### Second Method (Docker Compose - Recommended for EC2/Cloud Deployment)
- This method requires Docker and Docker Compose to be installed.
- Docker Compose will spin up the Node backend API container, configured to connect to your real Amazon DynamoDB cloud tables using the environment variables specified in `.env`.

Make sure you are in the root of your project and run:
```shell
docker compose build --no-cache
```

After the build is complete, run the containers:
```shell
docker compose up
```

Now start the Frontend development server:
```shell
cd public
npm start
```

Open `http://localhost:3000` in your browser.

#### AWS EC2 & Cloud Deployment
If you are deploying this backend to an **AWS EC2 instance** that resides in the same region as your Amazon DynamoDB tables, you can run without hardcoding any AWS credentials:

1. **Use IAM Roles**: Attach an IAM Role (Instance Profile) to your EC2 instance with permission policies allowing access to DynamoDB (e.g., `AmazonDynamoDBFullAccess` or a policy specifically scoped to your DynamoDB tables).
2. **Configure `.env`**:
   - Set `AWS_REGION` to your target AWS region (e.g., `us-east-1`).
   - Comment out or remove `DYNAMODB_ENDPOINT` so that the application connects to the public Amazon DynamoDB cloud endpoints instead of a local instance.
   - Comment out or remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. The `@aws-sdk/client-dynamodb` library automatically uses the default credential provider chain, which will securely retrieve temporary credentials from the EC2 Instance Metadata Service (IMDS).
3. **Initialize DynamoDB Tables**:
   To easily create the DynamoDB tables directly from your EC2 instance using the AWS CLI, run the utility script provided in the repository root:
   ```shell
   # Grant execute permissions
   chmod +x create-tables.sh

   # Run the script
   ./create-tables.sh
   ```
   *(Note: Ensure your EC2 instance has the AWS CLI installed and configured, or relies on an IAM instance role with appropriate table creation permissions.)*