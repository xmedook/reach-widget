CREATE TABLE IF NOT EXISTS widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  owner_email VARCHAR(255) NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  welcome_message TEXT DEFAULT '¿Cómo podemos ayudarte?',
  whatsapp_number VARCHAR(20),
  telegram_bot_token VARCHAR(100),
  telegram_bot_username VARCHAR(100),
  channels JSONB DEFAULT '["whatsapp","sms","telegram"]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  openclaw_gateway_url TEXT,
  openclaw_gateway_token TEXT,
  openclaw_agent_id TEXT,
  openclaw_enabled BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID REFERENCES widgets(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  country_code VARCHAR(5) DEFAULT '+52',
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp','sms','telegram','imessage')),
  source_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','replied')),
  message_sent TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_widget ON leads(widget_id);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_channel ON leads(channel);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
