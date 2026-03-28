const { Pool } = require("pg");

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(`
      ALTER TABLE widgets ADD COLUMN IF NOT EXISTS openclaw_gateway_url TEXT;
      ALTER TABLE widgets ADD COLUMN IF NOT EXISTS openclaw_gateway_token TEXT;
      ALTER TABLE widgets ADD COLUMN IF NOT EXISTS openclaw_agent_id TEXT;
      ALTER TABLE widgets ADD COLUMN IF NOT EXISTS openclaw_enabled BOOLEAN DEFAULT false;
    `);
    console.log("OpenClaw columns added to widgets table");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
