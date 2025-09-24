# Database Setup for Netlify Deployment

## Option 1: Supabase (Recommended - Free PostgreSQL)

1. Go to https://supabase.com and create a free account
2. Create a new project
3. Go to Settings > Database > Connection string
4. Copy the connection string (it looks like: `postgresql://postgres:[password]@[host]:5432/postgres`)
5. In your Netlify dashboard:
   - Go to Site settings > Environment variables
   - Add `DATABASE_URL` with your Supabase connection string
6. In Supabase SQL Editor, run the contents of `migrate_to_postgres.sql`

## Option 2: ElephantSQL (Free PostgreSQL)

1. Go to https://elephantsql.com and create a free account
2. Create a new instance (Tiny Turtle plan is free)
3. Copy the connection URL from the details page
4. Add `DATABASE_URL` environment variable in Netlify
5. Use their browser tool to run the `migrate_to_postgres.sql` script

## Option 3: Neon (Free PostgreSQL)

1. Go to https://neon.tech and create a free account
2. Create a new project
3. Copy the connection string from the dashboard
4. Add `DATABASE_URL` environment variable in Netlify
5. Use their SQL Editor to run the migration script

## Setting Environment Variables in Netlify

1. Go to your Netlify site dashboard
2. Navigate to Site settings > Environment variables
3. Click "Add variable"
4. Name: `DATABASE_URL`
5. Value: Your PostgreSQL connection string
6. Click "Save"
7. Redeploy your site

## Testing the Setup

After setting up the database:
1. Visit https://vertigo-logger.netlify.app/api/health
2. Should return `{"status":"ok","message":"Vertigo Logger API is running"}`
3. Visit https://vertigo-logger.netlify.app/api/episodes
4. Should return your migrated episodes data

Your app is now fully serverless and hosted entirely on Netlify!