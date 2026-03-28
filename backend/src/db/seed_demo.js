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

    await pool.query(`
      INSERT INTO widgets (name, owner_email, token, welcome_message, channels, openclaw_enabled, openclaw_gateway_url, openclaw_gateway_token, openclaw_agent_id)
      VALUES (
        'nexo Command Center Demo',
        'admin@nexosrv.one',
        'demo_nexo_master_2026',
        '¡Hola! 👋 Soy el asistente de nexo Command Center. ¿En qué puedo ayudarte?',
        '["whatsapp","telegram","sms"]',
        true,
        'https://master.nexosrv.one',
        '52e814d068169ace160a4fa83f3c9f47f3228bfaa3f11456',
        'nexo-master'
      )
      ON CONFLICT (token) DO NOTHING
    `);
    console.log("nexo Command Center demo widget seeded with token: demo_nexo_master_2026");
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
