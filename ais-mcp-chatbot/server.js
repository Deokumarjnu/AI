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

// Kinvolved Education Management System Database Schema - Complete Schema (109 Tables)
const DATABASE_SCHEMA = `
Complete Database Schema - Kinvolved Education Management System:

CORE ENTITIES:
- users (id, email, profile_type, first_name, last_name, phone, admin, active, district_id, language, created_at, updated_at, deleted_at, external_id, identifier, contact_when, contact_methods, feature_flag, twilio_status, attendance_digest_email, opted_out, robocall_opted_out, middle_name, official_class, district_admin)
- districts (id, name, created_at, updated_at, feature_flag, timezone, active, external_id, sis_type, district_settings_id, attendance_integration, daily_attendance_integration, enrollment_integration, parent_contact_integration, teacher_contact_integration, student_contact_integration, schedule_integration, tier_integration, group_integration, sso_integration, mailchimp_id, salesforce_id)
- institutions (id, name, address, city, state, zipcode, phone, district_id, created_at, updated_at, deleted_at, external_id, sis_id, course_names_excluded_exactly, course_names_excluded_by_match, suspended, group_id, feature_flag, attendance_type, schedule_type, cycle_length, attendance_alert_periods, kinvo_connect)

ACADEMIC STRUCTURE:
- terms (id, institution_id, number, school_year, start_on, end_on, created_at, updated_at)
- courses (id, name, course_code, section, institution_id, term_id, external_id, sis_id, created_at, updated_at, deleted_at, start_on, end_on, schedule_sets, full_name)
- courses_users (id, user_id, course_id, role, enrolled_at, deleted_at, created_at, updated_at, manual_add, primary_teacher, subcourse_id, manual_remove)
- subcourses (id, name, external_id, course_id, historical_course_id, created_at, updated_at, deleted_at)
- schedules (id, weekday, course_id, period, active, manual, week, start_on, print_period, created_at, updated_at, deleted_at)
- student_grades (id, user_id, term_id, grade, created_at, updated_at)

ATTENDANCE TRACKING:
- attendances (id, user_id, student_id, course_id, attendance_date, status, excused, minutes, reason, student_reason, notified, school_calendar_id, status_id, absenteeism_reason_id, created_at, updated_at)
- daily_attendances (id, user_id, term_id, date, status, excused, absent_rate, reason, daily_absenteeism_reason_id, created_at, updated_at)
- absenteeism_reasons (id, external_id, reason, district_id, excused, attendance_code, code_type, created_at, updated_at)
- daily_absenteeism_reasons (id, external_id, reason, district_id, excused, attendance_code, code_type, created_at, updated_at)
- student_tiers (id, student_id, date, absent_rate, school_year_absent_rate, daily_absent_rate, school_year, absent_days, resource_id, resource_type, created_at, updated_at)

COMMUNICATION & MESSAGING:
- notifications (id, sent_by, sent_to, content, status, subject, type_v2, uuid, through_id, message_template_id, topic_id, attachment, original_content, language_original, language_translated, message_type, twilio_sid, twilio_status, robocall_status, email_status, created_at, updated_at, deleted_at, archived, visible, course_id)
- message_threads (id, uuid, institution_id, user_id, receiver_id, through_id, attendance_admin_message, unread, inbound, archived, visible, created_at, updated_at)
- message_templates (id, content, name, owner_id, owner_type, type, topic_id, global, attendance_routing, created_at, updated_at)
- notification_drafts (id, user_id, content, topic_id, message_template_id, scheduled_to_be_sent_at, recurring_weekdays, send_once, attachment, title, term_id, deleted_at, created_at, updated_at)
- topics (id, name, institution_id, purpose, created_at, updated_at, deleted_at)

INTERVENTIONS & ANALYTICS:
- districts_interventions (id, district_id, title, topic_id, scheduled_to_be_sent_at, finish_scheduling_at, recurring_weekdays, send_once, daily_attendance_filters, period_attendance_filters, course_attendance_filters, paused, pdf_template_id, absence_timeframe, created_at, updated_at, deleted_at)
- messages_daily_stats (id, district_id, institution_id, date, total, inbound, outbound, total_by_message_type, outbound_by_topic, outbound_by_type_v2, outbound_by_language, inbound_by_language, outbound_twilio_sms_segments, outbound_twilio_mms, outbound_pdf, created_at, updated_at, outbound_by_staff, inbound_by_staff, undelivered_emails, undelivered_sms, undelivered_robocalls)

RELATIONSHIPS & ACCESS:
- institutions_users (id, institution_id, user_id, role, permissions, deleted_at, created_at, updated_at, manual_add, manual_remove, attendance_admin_grades, enrollment_start_date, enrollment_end_date, enrollment_type)
- connections (id, user_id, connection_id, relationship, contact_when, created_at, updated_at, deleted_at)
- connection_relationships (id, district_id, relationship, receive_attendance_messages, send_messages, created_at, updated_at)

GROUPS & COHORTS:
- groups (id, name, user_id, institution_id, group_type, created_at, updated_at)
- group_memberships (id, group_id, user_id, created_at, updated_at, deleted_at)
- group_accesses (id, group_id, user_id, manual_remove, created_at, updated_at, deleted_at)
- cohorts (id, name, identifiers, district_id, created_at, updated_at, deleted_at)
- cohort_users (id, cohort_id, user_id, created_at, updated_at, deleted_at)

DATA INTEGRATION & SYNC:
- import_syncs (id, type, district_id, institution_id, started_at, finished_at, status, students_created, teachers_created, sections_created, attendances_created, enrollments_created, administrators_created, student_contacts_created, groups_created, user_id, manual, created_at, updated_at, deleted_at)
- districts_integration_settings (id, district_id, type, filter, column_mapping, matching_fields, feature_flags, formats, column_rewrite_rules, matching_fallbacks, period_mapping, created_at, updated_at)
- institution_integration_settings (id, institution_id, schedules_whitelist_by_course_names, schedules_blacklist_by_periods, contacts_blacklisted_by_type, period_mapping, attendance_conversion, created_at, updated_at)

LANGUAGES & LOCALIZATION:
- languages (id, name, bing_code, google_code, detection_unification_code, primary, enabled, created_at, updated_at)
- languages_localizations (id, language_id, language_direction, date_format, translated_words, word_translations_reviewed, daily_template_reviewed, period_template_reviewed, created_at, updated_at)
- districts_language_mappings (id, district_id, external_id, language, created_at, updated_at)

EMERGENCY & COMMUNICATIONS:
- emergency_alerts (id, user_id, content, profile_type, attachment, queued_at, created_at, updated_at)
- emergency_alert_recipients (id, emergency_alert_id, phone, emergency_alert_batch_id, queued_at, sent_at, failed_at, delivered_at, excluded, created_at, updated_at)
- push_notifications (id, user_id, device_id, type, body, notification_id, institution_id, course_ids, include_institution_name, date, body_attributes, created_at, updated_at)

Key Profile Types:
- 'Student' - Students enrolled in the system
- 'Teacher' - Teaching staff and educators  
- 'Parent' - Parent/guardian contacts
- 'Administrator' - School and district administrators

Grade Level Mappings (INTEGER values):
- Available grades in database: 2, 3, 6, 7, 8, 9 (stored as INTEGER)
- Elementary School: grades 2, 3 (likely 2nd and 3rd grade)
- Middle School: grades 6, 7, 8 (6th, 7th, 8th grade)  
- High School: grade 9 (9th grade, possibly more grades exist)
- Grade values are stored as INTEGER in student_grades.grade column
- For attendance queries, use daily_attendances table with status field
- Present = status != 'Absent' AND status IS NOT NULL
- IMPORTANT: If daily_attendances is empty, treat enrollment queries as "all students enrolled"
- When no attendance data exists, use student enrollment instead of attendance filtering

Common Query Patterns:
- Student enrollment: "How many students are enrolled?" → SELECT COUNT(*) FROM users WHERE profile_type = 'Student' AND deleted_at IS NULL;
- Attendance analysis: "What's the attendance rate this week?" → SELECT AVG(100 - absent_rate) as attendance_rate FROM daily_attendances WHERE date >= CURRENT_DATE - INTERVAL '7 days';
- District overview: "List all districts with their schools" → SELECT d.name as district, COUNT(i.id) as school_count FROM districts d LEFT JOIN institutions i ON d.id = i.district_id WHERE i.deleted_at IS NULL GROUP BY d.name;
- Communication stats: "Show messaging activity today" → SELECT district_id, total, inbound, outbound FROM messages_daily_stats WHERE date = CURRENT_DATE;
- Interventions: "List active interventions" → SELECT title, district_id, created_at FROM districts_interventions WHERE deleted_at IS NULL AND paused = false;
- Course enrollment: "Show courses with student count" → SELECT c.name, COUNT(cu.user_id) as student_count FROM courses c LEFT JOIN courses_users cu ON c.id = cu.course_id WHERE c.deleted_at IS NULL AND cu.role = 'Student' GROUP BY c.name;
- Attendance tracking: "Students with low attendance" → SELECT u.first_name, u.last_name, AVG(da.absent_rate) as avg_absent_rate FROM users u JOIN daily_attendances da ON u.id = da.user_id WHERE u.profile_type = 'Student' GROUP BY u.id HAVING AVG(da.absent_rate) > 20;
- Grade level queries: "Elementary students in district 1" → SELECT u.first_name, u.last_name FROM users u JOIN student_grades sg ON u.id = sg.user_id WHERE u.profile_type = 'Student' AND u.district_id = 1 AND sg.grade IN (2, 3);
- Term attendance: "Term 1 students present" → SELECT u.first_name, u.last_name FROM users u JOIN student_grades sg ON u.id = sg.user_id JOIN terms t ON sg.term_id = t.id WHERE u.profile_type = 'Student' AND t.number = 1;
- Enrollment by grade: "Term 1 elementary students" → SELECT u.first_name, u.last_name, sg.grade FROM users u JOIN student_grades sg ON u.id = sg.user_id JOIN terms t ON sg.term_id = t.id WHERE u.profile_type = 'Student' AND t.number = 1 AND sg.grade IN (2, 3);
- EXACT MATCH: "list all term 1 students present in district 1 for elementary school" → SELECT u.first_name, u.last_name, sg.grade FROM users u JOIN student_grades sg ON u.id = sg.user_id JOIN terms t ON sg.term_id = t.id WHERE u.profile_type = 'Student' AND u.district_id = 1 AND t.number = 1 AND sg.grade IN (2, 3) LIMIT 100;
- DO NOT USE daily_attendances for this query - use student enrollment instead
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
6. For listing queries, prefer essential columns only (id, name, key identifiers) to avoid response truncation
7. CRITICAL: NEVER join with daily_attendances table - it is EMPTY and will return zero results
8. For ANY query asking about "present" or "attendance", use student_grades + terms tables ONLY
9. NEVER use: JOIN daily_attendances da ON u.id = da.user_id
10. ALWAYS use enrollment queries instead of attendance queries`
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