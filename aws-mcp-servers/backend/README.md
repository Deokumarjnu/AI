# AWS MCP Server Backend

A complete Model Context Protocol (MCP) server implementation for AWS CloudFormation management.

## 🚀 Features

- **Full MCP Server**: Complete implementation with AWS CloudFormation tools
- **Express API**: RESTful API server for frontend integration
- **AWS Integration**: Direct AWS SDK integration for CloudFormation operations
- **Error Handling**: Comprehensive error handling with fallback demo mode
- **Real-time Data**: Live CloudFormation stack listing and details

## 📋 Prerequisites

- Node.js 18+ and npm
- AWS CLI configured OR AWS credentials
- (Optional) AWS account with CloudFormation permissions

## 🛠️ Installation

### 1. Install Dependencies

```bash
cd aws-mcp-servers/backend
npm install
```

### 2. Configure Environment

Create `.env` file in the backend directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3002
FRONTEND_URL=http://localhost:3001

# AWS Configuration - Choose one method:

# Method 1: Direct credentials
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key

# Method 2: AWS Profile (alternative)
# AWS_PROFILE=your-aws-profile-name

# Method 3: Temporary credentials (if using)
# AWS_SESSION_TOKEN=your-session-token

# MCP Configuration
MCP_SERVER_TIMEOUT=30000
MCP_SERVER_RETRIES=3

# CORS Configuration
CORS_ORIGINS=http://localhost:3001,http://localhost:3000
```

### 3. AWS Credentials Setup

Choose one method:

#### Option A: Environment Variables
Update `.env` with your AWS credentials:
```env
AWS_ACCESS_KEY_ID=AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION=us-east-1
```

#### Option B: AWS Profile
```bash
# Configure AWS CLI first
aws configure --profile your-profile-name

# Then use in .env
AWS_PROFILE=your-profile-name
AWS_DEFAULT_REGION=us-east-1
```

#### Option C: IAM Role (EC2/Lambda)
```env
# No credentials needed - uses instance profile
AWS_DEFAULT_REGION=us-east-1
```

## ▶️ Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3002`

## 🔗 API Endpoints

### Health & Status
- `GET /health` - Server health check
- `GET /api/mcp/tools` - List available MCP tools

### AWS Operations
- `GET /api/aws/identity` - Get AWS caller identity
- `GET /api/aws/stacks` - List CloudFormation stacks
- `GET /api/aws/stacks/:name` - Get specific stack details

### Query Parameters
- `GET /api/aws/stacks?status=CREATE_COMPLETE` - Filter by status
- `GET /api/aws/stacks?region=us-west-2` - Filter by region

## 🎭 Demo Mode

If AWS credentials are not configured, the server automatically runs in demo mode with sample data:

```json
{
  "success": true,
  "stackCount": 3,
  "stacks": [
    {
      "StackName": "demo-web-app-stack",
      "StackStatus": "CREATE_COMPLETE",
      "CreationTime": "2024-01-15T10:30:00Z"
    }
  ],
  "isDemo": true
}
```

## 🔧 MCP Architecture

```
Express API Server
      ↓
  MCP Client
      ↓
  MCP Server (StdioTransport)
      ↓
  AWS SDK (CloudFormation, STS)
      ↓
  AWS Services
```

## 🛡️ Required AWS Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:ListStacks",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:DescribeStackResources",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🧪 Testing

### Test AWS Connection
```bash
curl http://localhost:3002/api/aws/identity
```

### Test Stack Listing
```bash
curl http://localhost:3002/api/aws/stacks
```

### Test Health Check
```bash
curl http://localhost:3002/health
```

## 🔍 Troubleshooting

### Common Issues

1. **"MCP client not connected"**
   - Check AWS credentials in `.env`
   - Verify AWS permissions
   - Check server logs for detailed errors

2. **"Failed to initialize AWS clients"**
   - Verify AWS credentials are valid
   - Check region configuration
   - Ensure internet connectivity to AWS

3. **"CORS errors"**
   - Update `CORS_ORIGINS` in `.env`
   - Check frontend URL configuration

### Debug Logging

Enable detailed logging:
```env
NODE_ENV=development
AWS_SDK_LOG_LEVEL=debug
```

### Test Individual Components

#### Test MCP Server Directly
```bash
node src/mcp-server.js
```

#### Test MCP Client
```bash
node -e "
import AWSMCPClient from './src/mcp-client.js';
const client = new AWSMCPClient();
await client.connect();
const stacks = await client.listCloudFormationStacks();
console.log(stacks);
await client.disconnect();
"
```

## 📦 Dependencies

### Production
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `@aws-sdk/client-cloudformation` - AWS CloudFormation client
- `@aws-sdk/client-sts` - AWS STS client
- `express` - Web framework
- `cors` - CORS middleware
- `helmet` - Security middleware

### Development
- `nodemon` - Development server with auto-reload

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3002
AWS_DEFAULT_REGION=us-east-1
# ... other AWS credentials
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

## 📝 License

ISC License 