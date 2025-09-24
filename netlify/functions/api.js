const { Pool } = require('pg');

// Database connection with better error handling
let pool;
try {
  pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: process.env.NETLIFY_DATABASE_URL?.includes('neon.tech') ? {
      rejectUnauthorized: false,
      require: true
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
} catch (error) {
  console.error('Database pool creation failed:', error);
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  const path = event.path.replace('/.netlify/functions/api', '');
  const method = event.httpMethod;

  try {
    let response;

    switch (true) {
      case path === '/health' && method === 'GET':
        response = await handleHealth();
        break;

      case path === '/test-db' && method === 'GET':
        response = await handleTestDB();
        break;

      case path === '/episodes' && method === 'GET':
        response = await handleGetEpisodes();
        break;

      case path === '/episodes' && method === 'POST':
        response = await handleCreateEpisode(JSON.parse(event.body || '{}'));
        break;

      case path.match(/^\/episodes\/\d+$/) && method === 'GET':
        const id = path.split('/')[2];
        response = await handleGetEpisode(id);
        break;

      case path.match(/^\/episodes\/\d+$/) && method === 'PUT':
        const updateId = path.split('/')[2];
        response = await handleUpdateEpisode(updateId, JSON.parse(event.body || '{}'));
        break;

      case path.match(/^\/episodes\/\d+$/) && method === 'DELETE':
        const deleteId = path.split('/')[2];
        response = await handleDeleteEpisode(deleteId);
        break;

      case path === '/analyze' && method === 'POST':
        response = await handleAnalyzeEpisode(JSON.parse(event.body || '{}'));
        break;

      case path === '/analytics' && method === 'GET':
        response = await handleGetAnalytics();
        break;

      case path === '/patterns' && method === 'GET':
        response = await handleGetPatterns();
        break;

      case path === '/export' && method === 'GET':
        response = await handleExportEpisodes();
        break;

      case path === '/report/pdf' && method === 'GET':
        response = await handleGeneratePDFReport();
        break;

      default:
        response = {
          statusCode: 404,
          body: JSON.stringify({ error: 'Not found' }),
        };
    }

    return {
      ...response,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    };

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function handleHealth() {
  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'ok', message: 'Vertigo Logger API is running' }),
  };
}

async function handleTestDB() {
  if (!pool) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Database pool not initialized',
        env_set: !!process.env.NETLIFY_DATABASE_URL,
        env_preview: process.env.NETLIFY_DATABASE_URL ? process.env.NETLIFY_DATABASE_URL.substring(0, 50) + '...' : 'not set'
      }),
    };
  }

  let client;
  try {
    console.log('Testing database connection...');
    client = await pool.connect();

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');

    // Test if episodes table exists
    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'episodes'
    `);

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'Database connection successful',
        current_time: result.rows[0].current_time,
        pg_version: result.rows[0].pg_version,
        episodes_table_exists: tableCheck.rows.length > 0,
        env_configured: !!process.env.NETLIFY_DATABASE_URL
      }),
    };
  } catch (error) {
    console.error('Database test error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Database connection test failed',
        details: error.message,
        code: error.code,
        env_set: !!process.env.NETLIFY_DATABASE_URL
      }),
    };
  } finally {
    if (client) client.release();
  }
}

async function handleGetEpisodes() {
  if (!pool) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database pool not initialized' }),
    };
  }

  let client;
  try {
    console.log('Attempting to connect to database...');
    client = await pool.connect();
    console.log('Database connected successfully');

    const result = await client.query('SELECT * FROM episodes ORDER BY timestamp DESC');
    console.log(`Found ${result.rows.length} episodes`);

    return {
      statusCode: 200,
      body: JSON.stringify(result.rows),
    };
  } catch (error) {
    console.error('Database query error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Database query failed',
        details: error.message,
        code: error.code
      }),
    };
  } finally {
    if (client) client.release();
  }
}

async function handleCreateEpisode(episode) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO episodes (timestamp, duration_minutes, severity, triggers, symptoms, location, activities_before, medications_taken, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      episode.timestamp || new Date().toISOString(),
      episode.duration_minutes,
      episode.severity,
      episode.triggers,
      episode.symptoms,
      episode.location,
      episode.activities_before,
      episode.medications_taken,
      episode.notes,
    ];

    const result = await client.query(query, values);
    return {
      statusCode: 201,
      body: JSON.stringify(result.rows[0]),
    };
  } finally {
    client.release();
  }
}

async function handleGetEpisode(id) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM episodes WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Episode not found' }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(result.rows[0]),
    };
  } finally {
    client.release();
  }
}

async function handleUpdateEpisode(id, episode) {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE episodes
      SET timestamp = $2, duration_minutes = $3, severity = $4, triggers = $5,
          symptoms = $6, location = $7, activities_before = $8, medications_taken = $9, notes = $10
      WHERE id = $1
      RETURNING *
    `;
    const values = [
      id,
      episode.timestamp,
      episode.duration_minutes,
      episode.severity,
      episode.triggers,
      episode.symptoms,
      episode.location,
      episode.activities_before,
      episode.medications_taken,
      episode.notes,
    ];

    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Episode not found' }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(result.rows[0]),
    };
  } finally {
    client.release();
  }
}

async function handleDeleteEpisode(id) {
  const client = await pool.connect();
  try {
    const result = await client.query('DELETE FROM episodes WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Episode not found' }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Episode deleted successfully' }),
    };
  } finally {
    client.release();
  }
}

async function handleAnalyzeEpisode(data) {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    // Fallback to simple analysis if no API key
    const analysis = `Analysis for episode: Severity ${data.severity}/5. Triggers: ${data.triggers || 'None specified'}. Symptoms: ${data.symptoms || 'None specified'}.`;
    return {
      statusCode: 200,
      body: JSON.stringify({ analysis }),
    };
  }

  try {
    // Call OpenAI API for intelligent analysis
    const prompt = `As a medical AI assistant, analyze this vertigo episode data and provide insights:

    Severity: ${data.severity}/5
    Symptoms: ${data.symptoms || 'Not specified'}
    Triggers: ${data.triggers || 'Not specified'}

    Please provide:
    1. Possible causes or patterns
    2. Recommendations for management
    3. When to seek medical attention

    Keep response concise and informative.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (response.ok) {
      const aiResponse = await response.json();
      const analysis = aiResponse.choices[0].message.content;

      return {
        statusCode: 200,
        body: JSON.stringify({
          analysis,
          ai_powered: true,
          recommendations: analysis.split('\n').filter(line =>
            line.includes('recommend') || line.includes('suggest') || line.includes('consider')
          )
        }),
      };
    } else {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

  } catch (error) {
    console.error('AI Analysis error:', error);
    // Fallback to simple analysis on API failure
    const analysis = `Analysis for episode: Severity ${data.severity}/5. Triggers: ${data.triggers || 'None specified'}. Symptoms: ${data.symptoms || 'None specified'}.`;
    return {
      statusCode: 200,
      body: JSON.stringify({
        analysis: analysis + " (AI analysis temporarily unavailable)",
        ai_powered: false
      }),
    };
  }
}

async function handleGetAnalytics() {
  const client = await pool.connect();
  try {
    // Execute all queries in parallel for better performance
    const [
      totalResult,
      avgSeverityResult,
      durationStatsResult,
      severityDistResult,
      triggerFreqResult,
      monthlyTrendsResult
    ] = await Promise.all([
      client.query('SELECT COUNT(*) as total FROM episodes'),
      client.query('SELECT AVG(severity) as avg_severity FROM episodes'),
      client.query(`
        SELECT
          AVG(duration_minutes) as average_minutes,
          MIN(duration_minutes) as min_minutes,
          MAX(duration_minutes) as max_minutes,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_minutes) as median_minutes
        FROM episodes
        WHERE duration_minutes IS NOT NULL
      `),
      client.query(`
        SELECT severity, COUNT(*) as count
        FROM episodes
        GROUP BY severity
        ORDER BY severity
      `),
      client.query(`
        SELECT
          COALESCE(NULLIF(triggers, ''), 'No trigger specified') as trigger,
          COUNT(*) as count
        FROM episodes
        GROUP BY triggers
        HAVING COUNT(*) > 0
        ORDER BY count DESC
        LIMIT 10
      `),
      client.query(`
        SELECT
          TO_CHAR(timestamp, 'YYYY-MM') as month,
          COUNT(*) as episode_count,
          AVG(severity) as average_severity
        FROM episodes
        GROUP BY TO_CHAR(timestamp, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
      `)
    ]);

    // Process duration stats
    const durationStats = durationStatsResult.rows[0];
    const duration_stats = {
      average_minutes: parseFloat(durationStats.average_minutes || 0),
      min_minutes: parseInt(durationStats.min_minutes || 0),
      max_minutes: parseInt(durationStats.max_minutes || 0),
      median_minutes: parseFloat(durationStats.median_minutes || 0)
    };

    // Process severity distribution
    const severity_distribution = severityDistResult.rows.map(row => ({
      severity: parseInt(row.severity),
      count: parseInt(row.count)
    }));

    // Process trigger frequency
    const trigger_frequency = triggerFreqResult.rows.map(row => ({
      trigger: row.trigger,
      count: parseInt(row.count)
    }));

    // Process monthly trends
    const monthly_trends = monthlyTrendsResult.rows.map(row => ({
      month: row.month,
      episode_count: parseInt(row.episode_count),
      average_severity: parseFloat(row.average_severity)
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        total_episodes: parseInt(totalResult.rows[0].total),
        average_severity: parseFloat(avgSeverityResult.rows[0].avg_severity || 0),
        duration_stats,
        severity_distribution,
        trigger_frequency,
        monthly_trends
      }),
    };
  } finally {
    client.release();
  }
}

async function handleGetPatterns() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        DATE_TRUNC('day', timestamp) as date,
        COUNT(*) as episode_count,
        AVG(severity) as avg_severity
      FROM episodes
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY date DESC
      LIMIT 30
    `);

    return {
      statusCode: 200,
      body: JSON.stringify(result.rows),
    };
  } finally {
    client.release();
  }
}

async function handleExportEpisodes() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM episodes ORDER BY timestamp DESC');
    const episodes = result.rows;

    // Convert to CSV format
    const headers = ['ID', 'Timestamp', 'Duration (min)', 'Severity', 'Triggers', 'Symptoms', 'Location', 'Activities Before', 'Medications', 'Notes'];
    let csvContent = headers.join(',') + '\n';

    episodes.forEach(episode => {
      const row = [
        episode.id,
        new Date(episode.timestamp).toISOString(),
        episode.duration_minutes || '',
        episode.severity,
        (episode.triggers || '').replace(/,/g, ';'),
        (episode.symptoms || '').replace(/,/g, ';'),
        (episode.location || '').replace(/,/g, ';'),
        (episode.activities_before || '').replace(/,/g, ';'),
        (episode.medications_taken || '').replace(/,/g, ';'),
        (episode.notes || '').replace(/,/g, ';')
      ];
      csvContent += row.map(field => `"${field}"`).join(',') + '\n';
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="vertigo-episodes-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache'
      },
      body: csvContent,
    };
  } finally {
    client.release();
  }
}

async function handleGeneratePDFReport() {
  // Simple PDF report functionality - would normally use a PDF library
  // For now, return a simple text-based report
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM episodes ORDER BY timestamp DESC');
    const episodes = result.rows;

    let reportText = 'VERTIGO EPISODES MEDICAL REPORT\n';
    reportText += '================================\n\n';
    reportText += `Generated: ${new Date().toISOString()}\n`;
    reportText += `Total Episodes: ${episodes.length}\n\n`;

    episodes.forEach((episode, index) => {
      reportText += `Episode ${index + 1}:\n`;
      reportText += `Date: ${new Date(episode.timestamp).toLocaleString()}\n`;
      reportText += `Severity: ${episode.severity}/5\n`;
      if (episode.duration_minutes) reportText += `Duration: ${episode.duration_minutes} minutes\n`;
      if (episode.symptoms) reportText += `Symptoms: ${episode.symptoms}\n`;
      if (episode.triggers) reportText += `Triggers: ${episode.triggers}\n`;
      if (episode.notes) reportText += `Notes: ${episode.notes}\n`;
      reportText += '\n';
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="vertigo-medical-report.txt"',
        'Cache-Control': 'no-cache'
      },
      body: reportText,
    };
  } finally {
    client.release();
  }
}