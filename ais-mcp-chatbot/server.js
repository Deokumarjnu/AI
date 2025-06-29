// Simple Express server to proxy chat requests to the Postgres MCP server

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Kinvolved Education Management System Database Schema
const DATABASE_SCHEMA = `
Available Tables:
- users (id, first_name, last_name, email, phone, profile_type, created_at, active, district_id, language)
- institutions (id, name, address, city, state, district_id, created_at, deleted_at)
- districts (id, name, created_at, active, timezone)
- courses (id, name, course_code, section, institution_id, term_id, created_at, deleted_at)
- attendances (id, student_id, course_id, attendance_date, status, excused, minutes, created_at)
- daily_attendances (id, user_id, date, status, excused, absent_rate, term_id)
- notifications (id, sent_by, sent_to, content, status, type_v2, created_at, topic_id)
- message_threads (id, institution_id, user_id, receiver_id, unread, archived, created_at)
- messages_daily_stats (id, district_id, institution_id, date, total, inbound, outbound)
- student_tiers (id, student_id, date, absent_rate, school_year_absent_rate, school_year)
- terms (id, institution_id, school_year, start_on, end_on)
- courses_users (id, user_id, course_id, role, deleted_at, enrolled_at)
- institutions_users (id, institution_id, user_id, role, permissions, deleted_at)
- districts_interventions (id, district_id, title, topic_id, scheduled_to_be_sent_at, recurring_weekdays, send_once, daily_attendance_filters, period_attendance_filters, created_at, updated_at, deleted_at, paused)
- topics (id, name, institution_id, deleted_at, created_at, purpose)
- message_templates (id, content, name, owner_id, type, created_at, topic_id, global)
- notification_drafts (id, user_id, content, topic_id, message_template_id, scheduled_to_be_sent_at, created_at, recurring_weekdays, deleted_at)

Key Profile Types:
- 'Student' - Students in the system
- 'Teacher' - Teaching staff
- 'Parent' - Parent/guardian contacts
- 'Administrator' - School administrators

Example queries:
- "How many students are in the system?" → SELECT COUNT(*) FROM users WHERE profile_type = 'Student' AND deleted_at IS NULL;
- "Show me today's attendance" → SELECT * FROM daily_attendances WHERE date = CURRENT_DATE LIMIT 20;
- "What's the overall attendance rate?" → SELECT AVG(100 - absent_rate) as attendance_rate FROM daily_attendances WHERE date >= CURRENT_DATE - INTERVAL '30 days';
- "How many schools are in each district?" → SELECT d.name, COUNT(i.id) as school_count FROM districts d LEFT JOIN institutions i ON d.id = i.district_id WHERE i.deleted_at IS NULL GROUP BY d.id, d.name;
- "List all districts" → SELECT id, name, timezone, active, created_at FROM districts ORDER BY name;
- "Show recent notifications" → SELECT * FROM notifications WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 10;
- "List interventions created last month" → SELECT id, title, district_id, created_at FROM districts_interventions WHERE created_at >= CURRENT_DATE - INTERVAL '1 month' AND deleted_at IS NULL ORDER BY created_at DESC;
- "Show active interventions" → SELECT id, title, district_id, paused, created_at FROM districts_interventions WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 20;
- "What topics are available?" → SELECT id, name, purpose FROM topics WHERE deleted_at IS NULL ORDER BY name;
`;

async function translateQuestionToSQL(question) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a SQL expert. Convert natural language questions to SQL queries.
          
Database Schema:
${DATABASE_SCHEMA}

Rules:
1. Only return the SQL query, no explanations
2. Use proper PostgreSQL syntax
3. If the question is unclear or not related to the database, return "INVALID_QUERY"
4. Always use safe queries (no DROP, DELETE without WHERE, etc.)
5. Limit results to 100 rows if no limit specified
6. For listing queries, prefer essential columns only (id, name, key identifiers) to avoid response truncation`
        },
        {
          role: "user",
          content: question
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    });

    const sqlQuery = response.choices[0].message.content.trim();
    
    if (sqlQuery === "INVALID_QUERY") {
      throw new Error("I can only answer questions about your education database. Please ask about students, teachers, districts, institutions, attendance, interventions, notifications, or messaging data.");
    }

    return sqlQuery;
  } catch (error) {
    console.error('Error translating question to SQL:', error);
    throw error;
  }
}

async function executeSQLQuery(sqlQuery) {
  try {
    console.log('Executing SQL via MCP:', sqlQuery);
    
    const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
    
    // Configure the MCP client transport
    const transport = new StdioClientTransport({
      command: 'mcp-server-postgres',
      args: [process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres']
    });
    
    const client = new Client({
      name: "chatbot-client",
      version: "1.0.0"
    }, {
      capabilities: {}
    });
    
    await client.connect(transport);
    
    try {
      const result = await client.callTool({
        name: "query",
        arguments: { sql: sqlQuery }
      });
      
      await client.close();
      
      return {
        success: true,
        data: result.content || result,
        rowCount: Array.isArray(result.content) ? result.content.length : 1
      };
      
    } catch (toolError) {
      await client.close();
      throw toolError;
    }
    
  } catch (error) {
    console.error('Error executing SQL query via MCP:', error);
    throw new Error(`Database query failed: ${error.message}`);
  }
}

async function formatResponse(sqlResult, originalQuestion) {
  try {
    if (!sqlResult.success) {
      return "Sorry, I encountered an error while querying the database.";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that explains database query results in natural language.
          
Rules:
1. Be conversational and friendly
2. Present data in a readable format
3. If it's a single number, give context
4. If it's a list, format it nicely
5. Keep responses concise but informative`
        },
        {
          role: "user",
          content: `Original question: "${originalQuestion}"
          
Query results: ${JSON.stringify(sqlResult.data)}
Row count: ${sqlResult.rowCount}

Please explain these results in natural language.`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error formatting response:', error);
    // Fallback to basic formatting
    if (sqlResult.data && sqlResult.data.length > 0) {
      return `Found ${sqlResult.rowCount} result(s):\n\n${JSON.stringify(sqlResult.data, null, 2)}`;
    }
    return "Query completed successfully.";
  }
}

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  try {
    // Step 1: Translate natural language to SQL
    console.log('User question:', message);
    const sqlQuery = await translateQuestionToSQL(message);
    console.log('Generated SQL:', sqlQuery);

    // Step 2: Execute SQL via MCP server
    const sqlResult = await executeSQLQuery(sqlQuery);
    console.log('SQL result:', sqlResult);

    // Step 3: Format response in natural language
    const formattedResponse = await formatResponse(sqlResult, message);
    console.log('Formatted response:', formattedResponse);

    res.json({
      success: true,
      response: formattedResponse,
      sql: sqlQuery, // Include for debugging
      rawData: sqlResult.data
    });

  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while processing your request.'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`AI Chatbot server running on http://localhost:${PORT}`);
  console.log('Make sure to set OPENAI_API_KEY in your .env file');
});