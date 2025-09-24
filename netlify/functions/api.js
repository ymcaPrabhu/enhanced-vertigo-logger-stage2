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
  // Simple analysis since we don't have AI service
  const analysis = `Analysis for episode: Severity ${data.severity}/5. Triggers: ${data.triggers || 'None specified'}. Symptoms: ${data.symptoms || 'None specified'}.`;

  return {
    statusCode: 200,
    body: JSON.stringify({ analysis }),
  };
}

async function handleGetAnalytics() {
  const client = await pool.connect();
  try {
    const [totalResult, avgSeverityResult, commonTriggersResult] = await Promise.all([
      client.query('SELECT COUNT(*) as total FROM episodes'),
      client.query('SELECT AVG(severity) as avg_severity FROM episodes'),
      client.query(`
        SELECT triggers, COUNT(*) as count
        FROM episodes
        WHERE triggers IS NOT NULL AND triggers != ''
        GROUP BY triggers
        ORDER BY count DESC
        LIMIT 5
      `),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        total_episodes: parseInt(totalResult.rows[0].total),
        average_severity: parseFloat(avgSeverityResult.rows[0].avg_severity || 0).toFixed(2),
        common_triggers: commonTriggersResult.rows,
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
    return {
      statusCode: 200,
      body: JSON.stringify(result.rows),
    };
  } finally {
    client.release();
  }
}