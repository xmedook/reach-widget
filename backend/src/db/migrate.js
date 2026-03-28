const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const schema = fs.readFileSync(
    path.join(__dirname, "schema.sql"),
    "utf-8"
  );

  try {
    await pool.query(schema);
    console.log("Migration completed successfully");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
