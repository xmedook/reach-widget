const { Pool } = require("pg");

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(`
      INSERT INTO widgets (name, owner_email, token, welcome_message, channels)
      VALUES (
        'Koode Demo',
        'demo@koode.mx',
        'demo_koode_2026',
        '¡Hola! Somos koode.mx 👋 ¿Cómo podemos ayudarte hoy?',
        '["whatsapp","sms","telegram"]'
      )
      ON CONFLICT (token) DO NOTHING
    `);
    console.log("Demo widget seeded with token: demo_koode_2026");
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
