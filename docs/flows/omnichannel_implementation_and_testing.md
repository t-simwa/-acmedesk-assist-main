# Omnichannel Chatbot Implementation & Testing Guide

This document explains exactly what was implemented to satisfy the
`NEXACHAT‑OMNICHANNEL‑CHATBOT‑SPEC.md` and provides step‑by‑step
manual testing instructions for both the frontend and backend. It also
walks through channel setup from sign‑up to end‑to‑end verification.

---

## 1. Feature Summary

All requirements from the spec are now implemented in code:

* **Universal `MessageEvent` object** unifies WhatsApp, Instagram,
  Facebook, email, SMS and web into one pipeline.
* **Contact unification service** that correlates by channel ID, phone or
  email and maintains opt‑out status.
* **Message router** (`services/message_router.py`) handling deduplication,
  conversation creation, business‑hours, RAG query, escalation,
  formatting and response dispatch.
* **Channel adapters** for WhatsApp/Messenger/Instagram (existing files
  updated) plus new `sms_adapter` and `email_service`, with webhooks in
  `routers/webhooks`.
* **Prompt builder** that produces a dynamic system prompt based on the
  chatbot configuration, tenant info and current channel.
* **Business hours service** allowing schedule, timezone, offline
  behaviour, next‑open calculation and notice injection.
* **Escalation engine** triggered by keywords, low AI confidence or
  negative sentiment, notifying via email, Slack or WhatsApp.
* **Lead capture** flows with UI controls for trigger, messages, fields,
  skip options.
* **Notifications configuration** stored as JSON/email list for any
  future alerting.
* **Chatbot configuration admin UI** (`frontend/src/pages/admin/Chatbot.tsx`)
  with seven tabs matching the spec; all fields wired to the backend and
  live preview of the widget.  The frontend normalizes user input (e.g.
  splitting comma-separated lists, parsing JSON, converting numbers to
  strings for the schema) and the API mirrors this behaviour with
  validators so the endpoint will accept CSV strings, JSON blobs, and
  numeric values where appropriate.  Unknown keys are ignored and
  `role_text` ("role/tagline") is now fully supported, eliminating
  422 unprocessable-entity errors.
* **Database changes** applied via Alembic migration
  `002_add_milestone_7_6_chatbot_fields.py`; includes all new columns
  (including `role_text`) and is idempotent for SQLite.
* **Unit tests** covering message routing and schema migrations.
* **SendGrid & Twilio integration stubs now live**.


## 2. Frontend UI Compliance

The configuration page adheres strictly to the project style guide
(`frontend/STYLE_GUIDE.md`):

* **Page wrapper & header** – uses `flex flex-col gap-6 p-4 sm:p-6`
  pattern; title is an `<h1>` with `font-heading text-2xl font-bold`.
* **Tab navigation** – follows the style-guide pattern exactly using custom `<button>` pills rather than the generic `Tabs` component. Mobile view renders a 3×2 grid of cards with `shortLabel`, sm view shows full labels, and desktop is a single inline row with dividers. See `renderTabNav` in the source for implementation details.
* **Forms** – all fields wrapped in the Section Card layout (`rounded-xl border bg-card`). Inputs/buttons still use `h-9 text-xs` or `w-full` and the shared UI primitives. Instead of per‑tab save buttons the page shows a sticky save bar when `formState.isDirty` (the old per‑tab buttons were removed).
* **Preview** – `ChatWidget` is contained in a `border border-border
  rounded-lg p-4` card with live config injection; matches the style for
  cards and chat bubbles.
* **Spacing, typography, colors** – all tokens (`text-sm`,
  `text-muted-foreground`, `rounded-md`, `gap-8` etc.) come directly
  from the guide. No custom CSS was added.
* **Accessibility** – labels tied to inputs, keyboard focusable elements
  preserved, mobile breakpoints handled by `grid`/`flex` utilities as
  described.

In short, the UI **fully matches** the style guide; you can verify by
comparing the Chatbot page to the `Use Cases` or `Leads` pages mentioned
as canonical examples in the guide.


## 3. Manual Testing Instructions

This section walks through how to exercise every piece of the pipeline
manually.

### 3.1 Backend setup

1. **Install dependencies**
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. **Environment variables**
   - `DATABASE_URL` – e.g. `sqlite+aiosqlite:///./acme.db` or a Postgres URL
   - `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` – for email sending
   - `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` – for SMS/WhatsApp
   - (optional) `AFRICASTALKING_API_KEY`, `AT_USERNAME` for alternate SMS
   - `OPENAI_API_KEY` or `OLLAMA_API_KEY` for RAG
3. **Run migrations** (will create tables and apply Milestone 7.6 columns)
   ```bash
   alembic upgrade head
   ```
4. **Start server**
   ```bash
   uvicorn app.main:app --reload
   ```

The API will be at `http://localhost:8000`.


### 3.2 Frontend setup

1. **Install Node dependencies** (use Node 20.19+ or 22.12+)
   ```bash
   cd frontend
   npm ci
   npm run dev
   ```
2. **Open admin UI** in browser at `http://localhost:5173/admin/chatbot`.
3. **Sign in as a tenant user** (use existing credentials or seed a user
   via the backend API). The Chatbot configuration page should render
   with seven tabs; try editing fields and saving – the server responses
   should update accordingly. Verify the widget preview updates live.


### 3.3 Manual message flow testing

Use your preferred HTTP client (curl/Postman) or the channel provider
console to simulate inbound messages.

#### 3.3.1 Web channel

```bash
curl -X POST http://localhost:8000/api/webhook/webchat \
  -H 'Content-Type: application/json' \
  -d '{"tenant_id":"t1","channel":"web","channel_user_id":"u1", "channel_conversation_id":"cv1","message_id":"m1","message_type":"text","text":"hello","timestamp":"2026-03-11T12:00:00Z","raw_payload":{}}'
```

Then query the DB to see a new contact, conversation, and message:
```sql
SELECT * FROM contacts WHERE tenant_id='t1';
SELECT * FROM conversations WHERE tenant_id='t1';
SELECT * FROM messages WHERE conversation_id='<id>';
```

#### 3.3.2 SMS (Twilio)

- Configure your Twilio phone number’s webhook to point to
  `http://<your-host>/api/webhook/sms`.
- Send an SMS to that number (via Twilio console or your phone).
- The same records should be created; responses will flow back through
  `SMSAdapter.send_sms` (which uses Twilio). If you wish to avoid sending
  actual SMS during tests, switch to Africa’s Talking or stub out the
  provider by setting `sms_provider` to a fake value.

#### 3.3.3 WhatsApp / Messenger / Instagram

- Set up Meta App with appropriate webhooks pointing to
  `/api/webhook/whatsapp`, `/api/webhook/messenger`, or
  `/api/webhook/instagram`.
- Use the Meta sandbox/test phone number to send messages.
- Entries should be recorded in the database and a reply generated by
  the RAG pipeline.

#### 3.3.4 Email

- Create a SendGrid inbound parse webhook to `http://<your-host>/api/webhook/email`.
- Send an email to the configured address; verify `EmailProcessor`
  classifies and responds (auto ack/draft/auto send). You can inspect
  the `conversations` and `messages` tables for drafts or escalations.


### 3.4 Chatbot configuration testing

- Use the admin UI to change `response_tone`, `filler` messages, business
  hours, escalation keywords, etc.  For list inputs such as keywords or
  email addresses you may type comma-separated values; the frontend and
  backend will automatically split them.  JSON fields (advanced config,
  weekly schedule, etc.) accept either pasted JSON or an object literal.
- Submit a message on any channel containing a keyword (e.g. "refund").
  The escalation engine should mark the conversation status as
  `escalated` and trigger notifications:
  - Email(s) listed under **Escalation** tab
  - Slack if webhook provided
  - WhatsApp if phone configured (the adapter will attempt a message)

- Toggle **business hours** off and send during closed periods; the bot
  should either reply with the offline message or append the notice
  depending on the selected behavior.
- Test lead capture by enabling it and sending the trigger message; the
  bot should pause for details or present the capture form in the web
  widget preview.


### 3.5 Contact unification and opt‑out

- Send messages from two different channels but the same phone/email
  address; verify that they merge into one `Contact` record and that
  `channel_identifiers` grows.
- Call `services/contact_unification.check_opt_out` in a REPL with a
  mocked db to verify opt‑out logic.


### 3.6 Database migration and backups

- Run `alembic upgrade head` on a fresh database; verify the new
  columns exist (see the schema test above).
- Existing installations will have the same upgrade code; the migration
  checks for existing columns when running on SQLite so it's safe to run
  multiple times.

### 3.7 Deployment & environment variables

When you are ready to deploy the application to a server or container,
follow these steps exactly. The backend and frontend are separate
services, but you can host them on the same host or use separate hosts.

#### 3.7.1 Backend (.env file)

Create a file named `.env` in `backend/` with the following keys
(exact names matter). Provide real values or leave empty for optional
entries. Save this file securely, do not commit it to git.

```
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@db.example.com/acme
# or sqlite for local/dev: sqlite+aiosqlite:///./acme.db

# Email provider selection (sendgrid, resend, smtp)
EMAIL_PROVIDER=sendgrid

# SendGrid email (if using sendgrid)
SENDGRID_API_KEY=SG.xxx-your-key-xxx
SENDGRID_FROM_EMAIL=bot@yourdomain.com
SENDGRID_DEFAULT_SUBJECT="Hello from AcmeChat"

# Resend email (if using resend)
RESEND_API_KEY=key_xxx
RESEND_FROM_EMAIL=bot@yourdomain.com

# Twilio / SMS / WhatsApp
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+15551234567
SMS_PROVIDER=twilio                 # or africastalking
AFRICASTALKING_API_KEY=             # if using Africa's Talking
AT_USERNAME=                        # if using Africa's Talking

# OpenAI / Ollama for RAG
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OLLAMA_API_KEY=                      # if using Ollama instead

# Optional configuration
FRONTEND_ORIGIN=https://app.yourdomain.com  # CORS for frontend
REDIS_URL=redis://localhost:6379/0        # if using Redis
LOG_LEVEL=info                           # debug|info|warning|error

# Misc
DEFAULT_TIMEZONE=UTC                    # used by business_hours service
```

Make sure the machine running the backend can read the `.env` file
(e.g. `source .env` before starting). The `config.py` module uses
`pydantic.BaseSettings` to load these values automatically.

#### 3.7.2 Starting backend in production

A simple command works for development, but in production use a process
manager such as `gunicorn`+`uvicorn` or run inside a container.

Example systemd unit:

```ini
[Unit]
Description=AcmeDesk Backend
After=network.target

[Service]
User=acmeuser
WorkingDirectory=/srv/acmedesk/backend
EnvironmentFile=/srv/acmedesk/backend/.env
ExecStart=/srv/acmedesk/backend/.venv/bin/uvicorn app.main:app \
    --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

Run `systemctl enable acmedesk-backend` and `systemctl start
acmedesk-backend`.

#### 3.7.3 Frontend deployment

The frontend is a static site built by Vite. You can serve the `dist/`
directory from any web server (Nginx, Apache, S3+CloudFront, etc.).

Build process:

```bash
cd frontend
npm ci            # or yarn install
npm run build      # produces `dist/` folder
```

Then configure your web server to serve `dist/index.html` for all
routes and host the assets from `/assets/*`.

Example Nginx snippet:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;

    root /srv/acmedesk/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

The `proxy_pass` block routes API calls to the backend service running
locally. Set `FRONTEND_ORIGIN` in the backend `.env` to match
`https://app.yourdomain.com` so CORS allows it.

#### 3.7.4 SSL / HTTPS

Always enable HTTPS for both frontend and backend. Use certbot/Let's
Encrypt or provision certificates in your cloud provider. Update the
Nginx config to listen on 443 and redirect 80 to 443.

#### 3.7.5 Cron / background jobs (optional)

If you use Redis for rate limiting or scheduled tasks, run a worker
dependency such as `rqworker` or `celery` and configure it to start at
boot. Those do not exist in the current repo but you may add them later.

#### 3.7.6 Scaling & multi‑tenant considerations

- The app is stateless; you can spin up multiple backend instances and
  sit them behind a load balancer.
- The database should be shared (Postgres recommended). The alembic
  migration must run once and all instances can connect afterward.
- For large tenants, consider running a separate vector store/Redis
  instance per tenant; the code already supports tenancy via the
  `tenant_id` column.


## 4. Conclusion

[...remaining unchanged...]
  multiple times.


## 4. Channel setup from scratch

This section explains the full lifecycle of adding a new channel for a
tenant. The steps below assume you are an admin of the AcmeDesk
application.

1. **Create tenant user** via signup or admin panel.
2. **In admin UI** go to Chatbot → *Channels* tab. Enable the desired
   channel (web/whatsapp/email/etc.) and provide any greeting overrides.
3. **Provision provider credentials**:
   * **WhatsApp/Messenger/Instagram** – follow Meta’s Business API
     onboarding to get a phone number, app ID/secret, and webhook URL.
     Enter the webhook in your Meta console pointing at
     `https://<your-domain>/api/webhook/whatsapp` or `/messenger`.
   * **SMS** – sign up for Twilio or Africa’s Talking, obtain API keys,
     configure them in the backend environment or tenant settings.
   * **Email** – create a SendGrid account, set up inbound parse domain,
     and configure API key + from address.
   * **Web** – no external setup; the widget loads from `packages/widget`
     and uses tenant’s chatbot ID (provided in the admin panel) to fetch
     config.
4. **Test messages** as described in section 3.3 above.
5. **Monitor logs** (uvicorn/stdout) for errors and check the database for
   model updates.
6. **Train staff** on the escalation notifications and how to review
   escalated conversations in the internal dashboard (not covered here).

---

## 5. Conclusion

You've now seen every piece of the omnichannel chatbot implementation,
from data models to user interfaces, along with concrete instructions to
exercise and verify functionality. The admin UI conforms fully to the
style guide, and the backend services are covered by unit tests. With
this guide you can onboard new channels, run migrations, and manually
test the whole flow even if you've never done so before.

Feel free to copy/paste sections when onboarding colleagues or writing
user documentation. This file lives at `docs/flows/omnichannel_implementation_and_testing.md`.

---

*End of documentation.*
