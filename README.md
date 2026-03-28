# Reach Widget

Widget JS embebable de captura conversacional multi-canal. Captura leads desde cualquier sitio web y los contacta por WhatsApp, SMS, Telegram o iMessage.

## Embeber en tu sitio (1 linea)

```html
<script src="https://reach-widget.onrender.com/widget/rw.min.js"
  data-token="TU_TOKEN"
  data-position="bottom-right"
  data-trigger="3s">
</script>
```

### Atributos

| Atributo | Descripcion | Default |
|---|---|---|
| `data-token` | Token del widget (obligatorio) | — |
| `data-position` | `bottom-right`, `bottom-left`, `top-right`, `top-left` | `bottom-right` |
| `data-trigger` | `3s` (tiempo), `exit` (exit intent), `scroll:50%` | `3s` |

## Variables de entorno

| Variable | Descripcion | Requerida |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Si |
| `WHATSAPP_TOKEN` | Meta WhatsApp Cloud API token | No (fallback a deep link) |
| `WHATSAPP_PHONE_ID` | Meta phone number ID | No |
| `WHATSAPP_VERIFY_TOKEN` | Token para verificar webhook | No |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | No (fallback a sms:// link) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | No |
| `TWILIO_FROM_NUMBER` | Twilio phone number | No |

## API Endpoints

### `GET /health`
Health check.

### `POST /api/widgets`
Crear un nuevo widget.

```json
{
  "name": "Mi Negocio",
  "owner_email": "hola@minegocio.com",
  "welcome_message": "Hola! Como podemos ayudarte?",
  "channels": ["whatsapp", "sms", "telegram"],
  "whatsapp_number": "+5215551234567",
  "telegram_bot_username": "mi_bot"
}
```

Respuesta:
```json
{
  "ok": true,
  "widget": { "id": "uuid", "token": "abc123...", "name": "Mi Negocio", "created_at": "..." }
}
```

### `GET /api/widgets/:token/config`
Config publica del widget (sin auth, CORS abierto).

### `POST /api/leads`
Registrar un lead y disparar mensaje.

```json
{
  "widget_token": "abc123",
  "phone": "5551234567",
  "country_code": "+52",
  "channel": "whatsapp",
  "source_url": "https://minegocio.com/landing"
}
```

### `GET /api/leads`
Listar leads. Requiere `Authorization: Bearer <widget_token>`.

Query params: `limit` (max 200), `offset`.

## Desarrollo local

```bash
# Backend
cd backend
npm install
export DATABASE_URL="postgresql://user:pass@localhost:5432/reachwidget"
npm run migrate
npm run seed   # Crea widget demo con token: demo_koode_2026
npm run dev

# Widget
cd widget
npm install
npm run build  # Genera widget/dist/rw.min.js
```

## Demo

Usa el token `demo_koode_2026` para probar:

```html
<script src="http://localhost:3000/widget/rw.min.js"
  data-token="demo_koode_2026"
  data-position="bottom-right"
  data-trigger="3s">
</script>
```

## Integración con OpenClaw (nexo Command Center)

Reach Widget puede conectarse a cualquier instancia de OpenClaw para que el agente
AI del cliente maneje toda la conversación automáticamente.

### Configurar un widget con OpenClaw

```
POST /api/widgets
{
  "name": "Mi Sitio Web",
  "owner_email": "cliente@empresa.com",
  "welcome_message": "¡Hola! ¿En qué te ayudamos?",
  "openclaw_enabled": true,
  "openclaw_gateway_url": "https://cliente.nexosrv.one",
  "openclaw_gateway_token": "TOKEN_DEL_GATEWAY",
  "openclaw_agent_id": "cliente-assistant",
  "channels": ["whatsapp", "telegram"]
}
```

### Flujo completo

1. Visitante llena el widget en el sitio del cliente
2. Reach Widget registra el lead y llama al gateway de OpenClaw
3. OpenClaw envía el mensaje de bienvenida via WhatsApp/Telegram
4. El agente (con SOUL.md del cliente) responde automáticamente
5. Dashboard de Reach Widget muestra el lead con estado "en conversación"

### Test de conectividad

```
POST /api/widgets/:token/test-gateway
```

Retorna `{ ok: true/false, version, latencyMs }`.

### Migración para bases existentes

```bash
npm run migrate:openclaw
```

## Deploy en Render

1. Conecta el repo a Render
2. Configura las variables de entorno en el dashboard
3. Render usa `render.yaml` para el deploy automatico
