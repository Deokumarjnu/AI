# AI Database Chatbot

An intelligent chatbot that allows users to query their PostgreSQL database using natural language questions. The application uses AI (OpenAI GPT-4) to translate natural language into SQL queries and integrates with Model Context Protocol (MCP) servers for database execution.

## Features

- 🤖 **Natural Language to SQL**: Ask questions in plain English
- 💬 **Chat Interface**: Modern, responsive chat UI
- 🔍 **SQL Query Display**: See the generated SQL queries
- ⚡ **Real-time Responses**: Fast query execution and results
- 📊 **Formatted Results**: AI-powered response formatting
- 🔒 **Safe Queries**: Built-in query validation and safety checks

## Architecture

### System Flow Diagram

```mermaid
flowchart TD
    A["👤 User enters question<br/>in natural language"] --> B["🌐 React Frontend<br/>(App.tsx)"]
    
    B --> C["📡 HTTP POST to /chat<br/>localhost:4000/chat"]
    
    C --> D["🖥️ Express Backend<br/>(server.js)"]
    
    D --> E["🤖 OpenAI GPT-4<br/>translateQuestionToSQL()"]
    
    E --> F["📝 Generated SQL Query<br/>with schema validation"]
    
    F --> G["⚡ MCP Client<br/>executeSQLQuery()"]
    
    G --> H["🔗 PostgreSQL MCP Server<br/>Model Context Protocol"]
    
    H --> I["🗄️ PostgreSQL Database<br/>Education Management System"]
    
    I --> J["📊 Query Results<br/>Raw data returned"]
    
    J --> K["🤖 OpenAI GPT-4<br/>formatResponse()"]
    
    K --> L["💬 Natural Language Response<br/>User-friendly format"]
    
    L --> M["📤 JSON Response<br/>{response, sql, rawData}"]
    
    M --> N["🌐 React Frontend<br/>Display message"]
    
    N --> O["👤 User sees:<br/>• Formatted answer<br/>• SQL query<br/>• Timestamp"]
    
    %% Error handling paths
    E -.-> P["❌ Invalid Query<br/>INVALID_QUERY"]
    G -.-> Q["❌ Database Error<br/>Connection/Query failed"]
    D -.-> R["❌ Server Error<br/>OpenAI API issues"]
    
    P --> S["🚨 Error Response<br/>User-friendly message"]
    Q --> S
    R --> S
    S --> N
    
    %% Database schema info
    T["📋 Database Schema<br/>• users<br/>• institutions<br/>• districts<br/>• courses<br/>• attendances<br/>• notifications<br/>• etc."] -.-> E
    
    %% Quick questions
    U["💡 Quick Questions<br/>• List all districts<br/>• Show today's attendance<br/>• How many students?<br/>• Messaging activity"] -.-> A
    
    style A fill:#e1f5fe
    style O fill:#e8f5e8
    style I fill:#fff3e0
    style E fill:#f3e5f5
    style K fill:#f3e5f5
    style S fill:#ffebee
```

### Architecture Overview

The application follows a hybrid approach:
1. **AI Agent (OpenAI)** handles natural language processing and SQL generation
2. **MCP Server** handles secure database execution
3. **Express Backend** orchestrates the communication
4. **React Frontend** provides the user interface

### Data Flow Summary
```
User Question → AI Agent (OpenAI) → SQL Query → MCP Server → Database → Results → AI Formatting → User
```

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- PostgreSQL database
- MCP PostgreSQL server (optional for demo)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration (for MCP server)
DATABASE_URL=postgresql://username:password@localhost:5432/your_database
```

### 3. Database Schema Configuration

Update the `DATABASE_SCHEMA` constant in `server.js` to match your actual database schema:

```javascript
const DATABASE_SCHEMA = `
Available Tables:
- your_table_1 (column1, column2, column3)
- your_table_2 (column1, column2, column3)
...
`;
```

### 4. MCP Server Integration

The current implementation includes a mock MCP server for demonstration. To integrate with a real PostgreSQL MCP server:

1. Install your MCP PostgreSQL server
2. Update the `executeSQLQuery` function in `server.js`
3. Uncomment and configure the MCP client code

Example MCP integration:
```javascript
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

// Configure your MCP server connection
const transport = new StdioClientTransport({
  command: 'your-postgres-mcp-server',
  args: ['--database-url', process.env.DATABASE_URL]
});
```

## Running the Application

### Development Mode

Start both the frontend and backend:

```bash
# Terminal 1: Start the React frontend (port 3000)
npm start

# Terminal 2: Start the Express backend (port 4000)
npm run server
```

### Production Build

```bash
npm run build
```

## Usage Examples

Try asking these types of questions:

### Basic Queries
- "Show me all users"
- "How many orders do we have?"
- "List all products"

### Analytical Questions
- "What's our total revenue this month?"
- "Who are our top 10 customers by order value?"
- "Which products are selling the best?"

### Complex Queries
- "Show me users who haven't placed any orders"
- "What's the average order value by month?"
- "Which categories have the highest profit margins?"

## API Endpoints

### `POST /chat`
Main chat endpoint for processing natural language questions.

**Request:**
```json
{
  "message": "How many users do we have?"
}
```

**Response:**
```json
{
  "success": true,
  "response": "You currently have 1,247 users in your database.",
  "sql": "SELECT COUNT(*) FROM users;",
  "rawData": [{"count": 1247}]
}
```

### `GET /health`
Health check endpoint.

## Architecture Decisions

### Why AI Agent + MCP?

1. **AI Agent (OpenAI) for Translation**:
   - Excellent at natural language to SQL conversion
   - Can understand context and intent
   - Provides schema-aware query generation
   - Handles complex multi-table queries

2. **MCP Server for Execution**:
   - Secure database access with proper authentication
   - Standardized protocol for database operations
   - Built-in query validation and safety features
   - Easy integration with various database systems

### Alternative Approaches

1. **MCP-Only Approach**: Some MCP servers support natural language directly, but this is less flexible and often less accurate.

2. **Direct Database Connection**: Could connect directly to PostgreSQL, but MCP provides better security, validation, and standardization.

## Security Considerations

- SQL injection prevention through AI validation
- Query complexity limits
- No destructive operations (DROP, DELETE without WHERE)
- Environment variable protection for API keys
- MCP server authentication and authorization

## Troubleshooting

### Common Issues

1. **"No API key provided"**: Make sure your `.env` file has a valid `OPENAI_API_KEY`
2. **Backend connection failed**: Ensure the Express server is running on port 4000
3. **MCP server errors**: Check your MCP server configuration and database connection

### Development

To see detailed logs, check the browser console (frontend) and terminal (backend) for debugging information.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
