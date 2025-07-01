# AWS Deployment Tool

A comprehensive AWS deployment management tool with CloudFormation stack management, built with React, TypeScript, and AWS MCP (Model Context Protocol) integration.

## Features

- **Authentication System**: Secure login with JWT tokens
- **AWS Account Management**: View and manage multiple AWS accounts
- **CloudFormation Stack Monitoring**: Real-time stack status and management
- **Dark Theme UI**: Modern, responsive interface matching enterprise tools
- **Real-time Updates**: WebSocket-based live updates for deployments
- **Role-based Access Control**: Admin and user roles with account-specific permissions
- **MCP Integration**: Uses AWS MCP servers for standardized cloud operations

## Architecture

```
├── frontend/          # React + TypeScript frontend
├── backend/           # Node.js + Express + AWS SDK backend
├── infrastructure/    # AWS CDK infrastructure code (future)
└── docs/             # Documentation
```

## Tech Stack

### Frontend
- React 18 with TypeScript
- Material-UI (MUI) with custom dark theme
- React Router for navigation
- Axios for API calls
- WebSocket for real-time updates

### Backend
- Node.js with Express
- TypeScript
- AWS SDK v3
- JWT for authentication
- WebSocket for real-time communication
- Model Context Protocol (MCP) integration

### Infrastructure (Planned)
- AWS CDK for infrastructure as code
- CloudFormation for resource management
- AWS Organizations for multi-account management

## Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- AWS CLI configured with appropriate credentials
- AWS account(s) with CloudFormation access

### Installation

1. **Clone and setup the project:**
```bash
git clone <repository-url>
cd aws-deployment-tool
```

2. **Backend Setup:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your AWS credentials and JWT secret
npm run dev
```

3. **Frontend Setup:**
```bash
cd ../frontend
npm install
npm start
```

4. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Health Check: http://localhost:4000/health

### Environment Configuration

Update `backend/.env` with your settings:

```env
# Server Configuration
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# AWS Configuration
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
```

## Default Login Credentials

For development/testing:
- **Admin**: admin@example.com / admin123
- **User**: user@example.com / user123

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/me` - Get user profile

### AWS Management
- `GET /aws/accounts` - Get AWS accounts
- `GET /aws/accounts/:id/stacks` - Get CloudFormation stacks
- `GET /aws/accounts/:id/stacks/:name` - Get stack details
- `GET /aws/dashboard/summary` - Get dashboard summary

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system health

## Development

### Frontend Development
```bash
cd frontend
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
```

### Backend Development
```bash
cd backend
npm run dev        # Start with nodemon
npm run build      # Compile TypeScript
npm start          # Start production server
```

## AWS Permissions Required

The application requires the following AWS permissions:

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
                "cloudformation:GetTemplate",
                "sts:GetCallerIdentity",
                "organizations:ListAccounts"
            ],
            "Resource": "*"
        }
    ]
}
```

## WebSocket Events

The application supports real-time updates via WebSocket:

- `stack_update` - CloudFormation stack status changes
- `deployment_status` - Deployment progress updates
- `account_update` - Account-level changes
- `error` - Error notifications
- `heartbeat` - Connection health checks

## Security Features

- JWT-based authentication with secure tokens
- Role-based access control (Admin/User)
- Account-level permission filtering
- CORS protection
- Helmet security headers
- Input validation and sanitization

## Deployment

### Production Build
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve the build folder with a web server
```

### Docker (Future)
```bash
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:
1. Check the [documentation](./docs/)
2. Review [common issues](#troubleshooting)
3. Open an issue on GitHub

## Roadmap

- [ ] AWS CDK integration for infrastructure deployment
- [ ] Multi-region support
- [ ] Change set preview and approval workflow
- [ ] Template validation and linting
- [ ] Cost estimation integration
- [ ] Audit logging and compliance reports
- [ ] Integration with CI/CD pipelines
- [ ] Custom deployment templates
- [ ] Slack/Teams notifications
- [ ] Advanced monitoring and alerting

## Troubleshooting

### Common Issues

1. **AWS Credentials Not Found**
   - Ensure AWS CLI is configured: `aws configure`
   - Check environment variables in .env file

2. **Connection Refused**
   - Verify backend is running on port 4000
   - Check CORS configuration if accessing from different origin

3. **JWT Token Errors**
   - Ensure JWT_SECRET is set in .env
   - Clear localStorage and login again

4. **CloudFormation Access Denied**
   - Verify AWS permissions for CloudFormation operations
   - Check IAM role/user permissions
