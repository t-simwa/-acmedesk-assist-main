# NexaChat — Complete Omnichannel Integration Flows
## Owner-Facing UI/UX Specification: How Every Channel Gets Connected

---

> **What this document covers:** The exact step-by-step experience an owner goes through inside `/dashboard/channels` to connect each of the six channels to their chatbot. This is not backend implementation — that is covered in Milestone 9 of the main plan. This document specifies what the owner sees, what they click, what they fill in, what feedback they receive, and what every possible error state looks like. Build both documents together.

---

## ✅ THE CHANNELS PAGE — ENTRY POINT

**Route:** `/dashboard/channels`

**Page layout:**

```
Header:
  Title: "Channels"
  Subtitle: "Connect the platforms where your customers already talk to you.
             Your AI handles every channel from one place."

Channel Grid (2 columns on desktop, 1 on mobile):
  6 channel cards arranged in this order:
  [Web Widget]  [WhatsApp]
  [Email]       [Instagram]
  [Facebook]    [SMS]
```

**Channel card anatomy (disconnected state):**
```
┌─────────────────────────────────────┐
│  [Channel Icon 32px]                │
│  Channel Name          [● Not Connected] │
│  One-line description               │
│                                     │
│  "What you can do:" (3 bullet points│
│   specific to this channel)         │
│                                     │
│  [Connect →]  button (brand gradient)│
└─────────────────────────────────────┘
```

**Channel card anatomy (connected state):**
```
┌─────────────────────────────────────┐
│  [Channel Icon 32px]                │
│  Channel Name          [● Connected] │
│                         green dot   │
│  Connected account/number/email     │
│  "Active since Jan 12, 2026"        │
│                                     │
│  [Configure]  [Disconnect]          │
└─────────────────────────────────────┘
```

**Plan gating display:**
```
If the owner's plan doesn't include a channel:
  Card shows a 🔒 lock overlay
  "Available on Growth plan"
  [Upgrade to Unlock] button instead of [Connect]
  Clicking anywhere on the card → /dashboard/upgrade?feature=channels
```

---
---

# CHANNEL 1 — WEB WIDGET
## Always Connected. No Setup Required.

---

The Web Widget is the only channel that is **active the moment an owner completes onboarding**. There is no connection flow. The card always shows "● Connected" from day one.

**What the Web Widget card shows:**
```
┌─────────────────────────────────────┐
│  🌐  Web Widget        [● Connected] │
│  Embedded on your website           │
│                                     │
│  Embed code ready                   │
│  Domain whitelist: 2 domains        │
│  Active since: Jan 10, 2026         │
│                                     │
│  [Configure]  [View Install Guide]  │
└─────────────────────────────────────┘
```

**Configure panel (slides in from right or opens as modal):**

```
TAB: Appearance
  Preview: Live widget preview on the right, updates in real-time
  - Widget launcher icon: 6 icon options + upload custom
  - Launcher label text: "Chat with us" (editable)
  - Widget position: Bottom Right / Bottom Left (radio)
  - Primary color: color picker + hex input
  - Show "Powered by NexaChat" badge: toggle

TAB: Behavior
  - Auto-open after: Never / 10s / 30s / 60s on page (select)
  - Mobile behavior: Same as desktop / Hide on mobile / Show button only
  - Greeting message: textarea
  - Offline message: textarea (shown outside business hours)

TAB: Domain Whitelist
  - Explanation: "Your widget will only load on domains you add here.
                  This prevents others from embedding your chatbot."
  - Input: type domain + [Add] button
  - List of added domains with [Remove] per domain
  - "Check Installation" button per domain

[Save Changes] — sticky bottom bar
```

---
---

# CHANNEL 2 — WHATSAPP BUSINESS
## The Most Important Integration. Build and Test This First.

---

## Pre-Connection: What the Owner Sees on the Card

```
┌─────────────────────────────────────┐
│  💬  WhatsApp Business  [● Not Connected] │
│  Reply to customers on WhatsApp     │
│                                     │
│  ✓ Handle text, voice, images       │
│  ✓ Send interactive menus & buttons │
│  ✓ Works 24/7 with your AI          │
│                                     │
│  [Connect WhatsApp →]               │
└─────────────────────────────────────┘
```

---

## The WhatsApp Setup Wizard

Clicking **[Connect WhatsApp →]** opens a full-page wizard (not a modal — this is complex enough to need full width).

```
Wizard header:
  [← Back to Channels]   "Connect WhatsApp Business"   Step 1 of 6
  Progress bar: [●●○○○○]

Step indicator row (always visible at top):
  1. Requirements  2. Connect Meta  3. Select Number
  4. Templates     5. Test          6. Configure
```

---

### ✅ STEP 1 — Requirements Checklist

```
Heading: "Before we start, confirm you have these ready"
Subtext:  "WhatsApp Business API requires a verified Meta Business Account.
           This is a one-time setup that takes 10-30 minutes."

Checklist (each item has a checkbox the owner ticks manually):

☐  A Facebook Business Account (not a personal account)
     [What's this? ↗] → opens Meta help article in new tab

☐  Your WhatsApp Business phone number
     This must be a number that is NOT currently active in the WhatsApp
     app on any phone. You can use a landline or a new SIM.
     [Can I use my current number? ↗]

☐  Your business is verified on Meta
     [How to verify my business ↗]

☐  A display name for your WhatsApp Business profile
     (e.g. "Simca Cleaning Nairobi" — this is what customers see)

INFO BOX (blue):
  "WhatsApp Business API via Meta Cloud is free. You pay only for
   conversation fees when messaging customers outside a 24-hour window.
   Conversations you initiate cost ~$0.005–$0.08 each depending on region.
   Customer-initiated conversations are free for 24 hours."
   [View full pricing ↗]

Bottom:
  [I have everything ready — Continue →]
  [I need help setting up Meta Business] → opens help article
```

---

### ✅ STEP 2 — Connect Meta Account

```
Heading: "Connect your Meta Business Account"
Subtext:  "We'll open a Meta authorization window. Sign in with the
           Facebook account that manages your WhatsApp Business number."

Center of page:
  Meta logo + NexaChat logo connected by a line

  Large button:
  [  f  Continue with Facebook  ]
  (Uses Meta's official blue — #1877F2)

  Fine print below button:
  "We request only the permissions needed to send and receive WhatsApp
   messages on your behalf. We never post to Facebook or access your
   personal data."
   [View exact permissions requested ↗]

  Permissions that will be requested (shown as a list):
  ✓ whatsapp_business_management — to access your phone numbers
  ✓ whatsapp_business_messaging — to send and receive messages
  ✓ business_management — to verify your Business account

What happens when owner clicks the button:
  Meta OAuth popup opens (new window, 600×700px)
  Owner logs in to Facebook if not already
  Owner selects their Business Account from a list
  Owner reviews and approves the permission request
  Popup closes
  Wizard automatically advances to Step 3
  (NexaChat stores the access token securely, encrypted in database)

ERROR STATE — if popup is closed without completing:
  Banner: "It looks like the Meta connection was cancelled."
  "Make sure you complete all steps in the Meta popup window."
  [Try Again] button

ERROR STATE — if no Business Account found:
  "We couldn't find a Meta Business Account linked to this Facebook login."
  "You need a Business Account, not a personal account."
  [Create a Meta Business Account ↗]  [Try a Different Account]
```

---

### ✅ STEP 3 — Select Phone Number

```
Heading: "Choose your WhatsApp Business number"
Subtext:  "These are the phone numbers in your Meta Business Account.
           Select the one you want to connect to NexaChat."

Content:
  List of phone numbers fetched from Meta API
  Each row:
    [+254 700 000 000]   "Simca Cleaning Main"   Status: Verified ✓
    Radio button to select

  If number is already in use by another app:
    Shows warning: "⚠ This number is connected to another WhatsApp
    Business solution. Connecting it here will disconnect it there."

  If no numbers appear:
    "No phone numbers found in this account."
    [Add a Phone Number in Meta Business Manager ↗]
    [Refresh List]

  Below the list:
    INFO BOX: "Your number must not be registered in the regular
    WhatsApp app. If it is, you'll need to delete that account first."
    [How to migrate from WhatsApp app to Business API ↗]

Bottom:
  [← Back]   [Continue with selected number →]
```

---

### ✅ STEP 4 — Message Templates

```
Heading: "Set up your message templates"
Subtext:  "WhatsApp requires pre-approved templates for messages sent
           outside a 24-hour window. We've prepared the essential ones
           for you. Submit them now so they're ready when you need them."

EXPLANATION BOX:
  "When a customer messages you, you have 24 hours to reply freely.
   After 24 hours of silence, you can only use approved templates.
   These templates must be submitted to Meta for review (usually
   takes 24–48 hours)."

Template list — 4 templates, each shown as a card:

┌──────────────────────────────────────────────────────┐
│  Template 1: "out_of_hours_response"                 │
│  Category: UTILITY                                   │
│                                                      │
│  Preview:                                            │
│  "Hi {{1}}! Thanks for reaching out to {{2}}. We're │
│   currently outside business hours but we'll get     │
│   back to you first thing {{3}}."                    │
│                                                      │
│  Variables:  {{1}} Customer name                     │
│              {{2}} Business name                     │
│              {{3}} Next business day/time            │
│                                                      │
│  [Edit template text]   Status: ○ Not submitted      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Template 2: "conversation_reopener"                 │
│  Category: UTILITY                                   │
│                                                      │
│  Preview:                                            │
│  "Hi {{1}}, this is {{2}}. Following up on your     │
│   recent enquiry — is there anything else I can      │
│   help you with?"                                    │
│                                                      │
│  Status: ○ Not submitted                             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Template 3: "booking_confirmation"                  │
│  Category: UTILITY                                   │
│                                                      │
│  Preview:                                            │
│  "Hi {{1}}! Your booking with {{2}} is confirmed ✓  │
│   Date: {{3}} | Time: {{4}} | Service: {{5}}         │
│   Reply HELP if you need to change anything."        │
│                                                      │
│  Status: ○ Not submitted                             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Template 4: "lead_followup"                         │
│  Category: MARKETING                                 │
│                                                      │
│  Preview:                                            │
│  "Hi {{1}}, we noticed you reached out to {{2}}      │
│   recently. We'd love to help — what's the best      │
│   way to assist you today?"                          │
│                                                      │
│  Status: ○ Not submitted                             │
└──────────────────────────────────────────────────────┘

Bottom of page:
  INFO BOX (yellow):
  "Meta reviews templates in 24–48 hours. Your chatbot works
   immediately on Step 6 — templates just unlock messaging after
   the 24-hour window. You can add more templates later in
   Settings → Channels → WhatsApp → Templates."

  [Submit All 4 Templates to Meta]
    → API call to submit all templates
    → Each card status changes to "⏳ Pending Meta Review"
    → Toast: "Templates submitted. You'll be notified when approved."

  [Skip for now — I'll add templates later]
    → Advances to Step 5 with a warning banner:
    "Reminder: without approved templates, your bot can only reply
     within 24 hours of a customer's last message."

Bottom nav:
  [← Back]   [Continue →]
```

---

### ✅ STEP 5 — Test Connection

```
Heading: "Test your WhatsApp connection"
Subtext:  "Send a test message to confirm everything is working."

Center panel:
  ┌─────────────────────────────────────────────────┐
  │  📱  Send a test message                        │
  │                                                 │
  │  1. Open WhatsApp on your phone                 │
  │  2. Message this number:                        │
  │                                                 │
  │  [ +254 700 000 000 ]  [Copy]                   │
  │  (your newly connected business number)         │
  │                                                 │
  │  3. Send the word:  TEST                        │
  │                                                 │
  │  Waiting for your test message...               │
  │  [  ⏳ Listening...  ]  (animated pulse)        │
  │                                                 │
  └─────────────────────────────────────────────────┘

When TEST message is received by the platform:
  → The listening animation becomes a green checkmark
  → Confetti animation (subtle)
  → "✓ Test message received! Your WhatsApp channel is working."
  → Platform sends back an auto-reply:
    "Great news! Your NexaChat AI is now connected to this
     WhatsApp number. Send a real question to see it in action."
  → [Continue to configure →] button activates

If no message received after 3 minutes:
  "Still waiting... try sending the message again."
  Troubleshooting accordion:
    ▸ Make sure you're messaging [number], not your own number
    ▸ Check that your Meta Business Account is fully verified
    ▸ Make sure the phone number is active and can receive messages
  [Reconnect Meta Account] | [Contact Support]

Bottom nav:
  [← Back]   [Continue →]  (Continue available even without test)
```

---

### ✅ STEP 6 — Configure Behavior

```
Heading: "Configure your WhatsApp behavior"
Subtext:  "These settings control how your AI responds on WhatsApp.
           You can change all of these anytime in Settings → Channels."

SECTION: Greeting Message
  Label: "First message when a new customer messages you"
  Textarea (pre-filled):
  "Hi! 👋 Thanks for reaching out to [Business Name]. I'm here to help —
   what can I assist you with today?"
  Character counter: 62/1000
  [Preview how this looks on WhatsApp] → shows phone mockup

SECTION: Business Hours on WhatsApp
  Toggle: "Use my global business hours settings" (ON by default)
  If toggled OFF: shows a separate hours table for WhatsApp only
  "Outside hours behavior":
    ○ Keep AI active 24/7 (recommended)
    ○ Send offline template message + collect contact details only

SECTION: Response Delay
  Label: "Add a typing delay before responding"
  Subtext: "A small delay feels more natural and human."
  Slider: 0s — 3s — 8s  (default: 2s)
  "Typing indicator" toggle: ON (shows "typing..." bubble to customer)

SECTION: Auto-reply to Unknown Intents
  Textarea: What to say when the AI doesn't know the answer
  Pre-filled: "That's a great question — let me connect you with a
  team member who can help better. What's the best way to reach you?"

SECTION: Voice Message Handling
  Toggle: "Transcribe and respond to voice messages" — ON
  Subtext: "Voice notes are transcribed using AI and answered
            like text messages."

SECTION: Image Handling
  Toggle: "Analyze and respond to images customers send" — ON
  Subtext: "Customers can send photos of products, problems, or
            documents. Your AI will read and respond to them."

Bottom:
  [← Back]   [Finish Setup →]
```

---

### ✅ POST-SETUP — WhatsApp Connected State

```
After [Finish Setup]:
  Full-page success screen:

  ✅  (large animated checkmark)
  "WhatsApp is now live!"

  Summary card:
  Connected number:  +254 700 000 000
  Templates:         4 submitted (pending Meta review)
  First message:     "Hi! 👋 Thanks for reaching out..."
  Status:            ● Active

  Two CTA buttons:
  [Test Your Chatbot →]  (opens chat simulator)
  [Go to Inbox →]        (goes to /dashboard/inbox)

  "Share this number with your customers and they can start
   chatting with your AI right away."
```

---

### ✅ WhatsApp Configure Panel (after connected)

Clicking **[Configure]** on the connected WhatsApp card opens a right-side panel with tabs:

```
TAB: General
  - Connected number (read-only)
  - Business display name (read-only, change in Meta)
  - Status indicator
  - [Disconnect WhatsApp] — red button at bottom

TAB: Templates
  Table of all submitted templates:
  Name | Category | Status (Approved ✓ / Pending ⏳ / Rejected ✗) | Preview | Actions
  [+ Submit New Template] button
  Opens template composer:
    Template name (lowercase, underscores only)
    Category: Utility / Marketing / Authentication
    Language selector
    Body text with {{variable}} insertion helper
    Footer text (optional)
    Buttons (optional — up to 3)
    [Submit to Meta for Review]

TAB: Behavior
  All settings from Step 6, editable
  [Save Changes]
```

---
---

# CHANNEL 3 — EMAIL
## Cleanest Setup. No OAuth. Just DNS.

---

## Pre-Connection Card

```
┌─────────────────────────────────────┐
│  📧  Email              [● Not Connected] │
│  Handle email enquiries with AI     │
│                                     │
│  ✓ Auto-reply or draft for review   │
│  ✓ Full thread continuity           │
│  ✓ Smart confidence routing         │
│                                     │
│  [Connect Email →]                  │
└─────────────────────────────────────┘
```

---

## The Email Setup Wizard (3 Steps)

```
Step indicator:
  1. Your Email Address   2. Forward Setup   3. Configure & Test
```

---

### ✅ STEP 1 — Your Email Address

```
Heading: "Which email address should your AI monitor?"
Subtext:  "This is the email your customers send enquiries to.
           Your AI will read and respond to every email that arrives."

Input field:
  Label: "Support email address"
  Placeholder: "support@yourbusiness.com"
  Validation:
    - Must be a valid email format
    - Cannot be a Gmail/Yahoo/Hotmail address (warn but don't block)
    - If Gmail/Yahoo: show advisory:
      "⚠ We recommend a business email (yourname@yourdomain.com)
       for professional appearance and better deliverability.
       Gmail addresses work but may reduce client trust."

  [Continue →]
```

---

### ✅ STEP 2 — Set Up Email Forwarding

```
Heading: "Forward your email to NexaChat"
Subtext:  "You need to set up forwarding so NexaChat receives
           a copy of every email sent to your address."

YOUR DEDICATED INBOUND ADDRESS:
  ┌──────────────────────────────────────────────────────┐
  │  tenant-a3f9b2@inbound.nexachat.com        [Copy]   │
  └──────────────────────────────────────────────────────┘
  "This address is unique to your account. Guard it — don't
   share it publicly."

HOW TO SET UP FORWARDING — tabbed by email provider:

[Gmail] [Google Workspace] [Outlook] [Zoho] [Other / cPanel]

GMAIL TAB:
  1. Open Gmail → Settings (gear icon) → See all settings
  2. Click the "Forwarding and POP/IMAP" tab
  3. Click "Add a forwarding address"
  4. Paste this address: tenant-a3f9b2@inbound.nexachat.com
  5. Gmail will send a confirmation code to that address
  6. Come back here and enter the confirmation code below:
     [  Confirmation code  ]  [Verify]
  7. Back in Gmail, select "Forward a copy to..." and Save

  [Screenshot showing exactly where to click in Gmail settings]

GOOGLE WORKSPACE TAB:
  (Admin route — more complex)
  Option A: User-level forwarding (same as Gmail steps above)
  Option B: Admin routing rule for the whole domain:
    1. Go to Google Admin → Apps → Google Workspace → Gmail
    2. Click "Routing" → "Add a route"
    3. Enter recipient: support@yourdomain.com
    4. Change route to: tenant-a3f9b2@inbound.nexachat.com
    5. Save
  [Detailed screenshot guide]

OUTLOOK TAB:
  1. Settings → View all Outlook settings
  2. Mail → Forwarding
  3. Enable forwarding to: tenant-a3f9b2@inbound.nexachat.com
  4. Check "Keep a copy of forwarded messages" — ON
  5. Save
  [Screenshot]

ZOHO TAB:
  1. Settings → Email Forwarding
  2. Add forwarding: tenant-a3f9b2@inbound.nexachat.com
  3. Save
  [Screenshot]

OTHER / cPanel TAB:
  1. Log in to your cPanel or email hosting admin
  2. Find "Email Forwarders" or "Email Routing"
  3. Add forwarder: support@yourdomain.com →
     tenant-a3f9b2@inbound.nexachat.com
  4. Save
  "Still stuck? [Contact support →] and we'll help you."

AFTER SETUP — Verification:
  "Send a test email to support@yourbusiness.com from any
   address right now. We'll detect it here."

  [  ⏳ Waiting for test email...  ]  (animated)

  When test email received:
    ✓ "We received your test email! Forwarding is working."
    [Continue →]

  Manual verify option:
    "Already set up forwarding? [Check manually →]"
    → sends a ping to inbound address and waits 60s

Bottom nav:
  [← Back]   [Continue →]
```

---

### ✅ STEP 3 — Configure & Test

```
Heading: "Configure your email AI behavior"

SECTION: Display Name & From Address
  "When your AI sends emails, what name should appear?"
  From Name:    [Simca Cleaning Support    ]
  Reply-to:     [support@simcacleaning.com ] (auto-filled from Step 1)
  Subtext: "Emails sent by your AI will appear to come from this
            name and address."

SECTION: Email Signature
  Textarea (pre-filled):
  "—
  Simca Cleaning Support
  📞 +254 700 000 000
  🌐 simcacleaning.com"
  Subtext: "Added to the bottom of every reply sent by your AI."

SECTION: AI Response Mode
  Label: "How should your AI handle incoming emails?"

  Radio options with clear explanation:

  ○ Auto-send (Recommended for simple support enquiries)
    "AI responds immediately when confidence is high (≥85%).
     Reviews lower-confidence responses before sending."

  ○ Always draft first (Recommended for professional or B2B services)
    "AI drafts every response. You review and approve before
     anything is sent. More control, more effort."

  ○ Hybrid (Smart default — best of both)
    "High confidence → sent automatically.
     Lower confidence → drafted for your review.
     Very low confidence → flagged for your manual reply."

  Confidence threshold slider (shown for Auto-send and Hybrid):
    Auto-send above: [====●=====] 85%
    Draft below:     [===●======] 60%

SECTION: Auto-acknowledgement
  Toggle: "Send instant acknowledgement to every inbound email" — ON
  Textarea:
  "Thank you for emailing Simca Cleaning! We've received your message
   and will respond within a few hours. For urgent enquiries, call us
   at +254 700 000 000."
  Subtext: "Sent within 30 seconds. Prevents customers wondering if
            their email arrived while your AI processes the reply."

Bottom:
  [← Back]   [Save & Activate Email Channel →]
```

---

### ✅ POST-SETUP — Email Connected State

```
✅ "Email channel is now live!"

Summary:
  Monitoring:  support@simcacleaning.com
  Mode:        Hybrid (auto-send ≥85%, draft <85%)
  Signature:   Active
  Auto-reply:  Active (30s)

[Go to Inbox →]   [Send yourself a test email →]
```

---

### ✅ Email Configure Panel (after connected)

```
TAB: General
  - Monitored address
  - Inbound address (your NexaChat forward address)
  - [Test forwarding] button
  - [Disconnect Email] — red

TAB: Behavior
  - Response mode (auto-send / draft / hybrid)
  - Confidence thresholds
  - Auto-acknowledgement toggle + message
  - Business hours behavior for email

TAB: Appearance
  - From name
  - Reply-to address
  - Email signature editor (with formatting)
  - [Send preview email to myself]

TAB: Blocked Senders
  - Add email addresses or domains to block
  - (e.g., block known spam domains)
  [Save Changes]
```

---
---

# CHANNEL 4 — INSTAGRAM DMs
## Requires Facebook Page Connection First.

---

## Pre-Connection Card

```
┌─────────────────────────────────────┐
│  📸  Instagram DMs      [● Not Connected] │
│  Reply to Instagram DMs with AI     │
│                                     │
│  ✓ Respond to direct messages       │
│  ✓ Auto-reply to story mentions     │
│  ✓ Quick reply chips in DMs         │
│                                     │
│  [Connect Instagram →]              │
└─────────────────────────────────────┘
```

---

## Instagram Setup Wizard (4 Steps)

```
Step indicator:
  1. Requirements   2. Connect Meta   3. Select Account   4. Configure
```

---

### ✅ STEP 1 — Requirements

```
Heading: "What you need before connecting Instagram"

Checklist:
☐  An Instagram Business or Creator account
     (Personal accounts cannot use the messaging API)
     [How to switch to a Business account ↗]

☐  Your Instagram account must be connected to a Facebook Page
     (This is required by Meta — Instagram API runs through Facebook)
     [How to connect Instagram to a Facebook Page ↗]

☐  You are an admin of the Facebook Page
     (Not just a moderator — you need full admin access)

INFO BOX:
  "Instagram and Facebook use the same Meta API. If you've already
   connected Facebook Messenger above, Instagram uses the same
   Meta connection. You may be able to skip Step 2."

  → If Facebook is already connected:
    Show: "✓ You already have a Meta connection from Facebook.
           We can use that — no need to re-authorize."
    [Use existing Meta connection →] skips directly to Step 3

Bottom:
  [I have everything ready →]
```

---

### ✅ STEP 2 — Connect Meta

```
Identical to WhatsApp Step 2 in appearance.

Heading: "Connect your Meta account"

BUT: different permissions requested:
  ✓ instagram_manage_messages
  ✓ instagram_basic
  ✓ pages_messaging
  ✓ pages_read_engagement

If Meta is already connected (from WhatsApp or Facebook):
  Show: "✓ Meta account already connected as [Facebook name]"
  "We'll request the additional Instagram permissions now."
  [Authorize Instagram Permissions →]
  (opens a smaller OAuth popup requesting only the Instagram-specific
   permissions not yet granted)
```

---

### ✅ STEP 3 — Select Instagram Account

```
Heading: "Choose your Instagram account"
Subtext:  "These are the Instagram Business accounts linked to
           your Meta connection."

List of accounts:
  [@simcacleaning]  "Simca Cleaning"   [Connected Page: Simca Cleaning KE]
  Radio to select

  If account is a Personal account (not Business):
    Row shows: ⚠ "Personal account — not compatible"
    Tooltip: "Switch this account to Business or Creator to use the API"

  If no Instagram accounts appear:
    "No Instagram Business accounts found."
    [Switch your account to Business ↗]
    [Connect Instagram to a Facebook Page ↗]
    [Refresh List]

Bottom:
  [← Back]   [Continue →]
```

---

### ✅ STEP 4 — Configure

```
Heading: "Configure your Instagram DM behavior"

SECTION: Welcome Message (Ice Breakers)
  Label: "Suggested questions shown to new DM openers"
  Subtext: "Up to 4 quick-start options that appear when someone
            opens a DM with you for the first time."
  4 input fields:
    [What are your service prices?        ]  ✕
    [How do I book an appointment?        ]  ✕
    [What areas do you serve?             ]  ✕
    [+  Add ice breaker question]

SECTION: Story Mention Auto-Reply
  Toggle: "Auto-reply when someone mentions you in their story" — ON
  Message textarea:
  "Thank you so much for the mention! 🙏 Is there anything
   I can help you with today?"
  Subtext: "Sent within 60 seconds of a story mention. Creates
            an instant conversation."

SECTION: Story Reply Behavior
  Toggle: "Respond to replies on your own stories" — ON
  Message: "Thanks for engaging with our story! How can I help?"

SECTION: Quick Reply Chips
  Toggle: "Show quick reply options after AI responses" — ON
  Subtext: "Your AI will automatically add relevant quick reply
            chips at the end of responses based on context."

Bottom:
  [← Back]   [Connect Instagram →]
```

---

### ✅ POST-SETUP — Instagram Connected

```
✅ "Instagram is live!"

Summary:
  Account:       @simcacleaning
  Ice breakers:  4 configured
  Story replies: Active
  DM replies:    Active (AI)

[View DM Inbox →]   [Test it — DM your account →]
```

---

### ✅ Instagram Configure Panel (after connected)

```
TAB: General
  - Connected account
  - Linked Facebook Page
  - Status
  - [Disconnect Instagram]

TAB: Ice Breakers
  4 question inputs
  [Save & Sync to Instagram]
  Note: "Changes sync to Instagram within 5 minutes"

TAB: Story Settings
  - Story mention auto-reply toggle + message
  - Story reply toggle + message

TAB: Behavior
  - Quick reply chips toggle
  - 24-hour window handling setting
  [Save Changes]
```

---
---

# CHANNEL 5 — FACEBOOK MESSENGER
## Same Meta Connection as Instagram.

---

## Pre-Connection Card

```
┌─────────────────────────────────────┐
│  💙  Facebook Messenger [● Not Connected] │
│  Chat with Facebook Page visitors   │
│                                     │
│  ✓ Persistent menu in Messenger     │
│  ✓ Welcome message + Get Started    │
│  ✓ Rich cards and carousels         │
│                                     │
│  [Connect Facebook →]               │
└─────────────────────────────────────┘
```

---

## Facebook Messenger Setup Wizard (4 Steps)

```
Steps: 1. Requirements   2. Connect Meta   3. Select Page   4. Configure
```

---

### ✅ STEP 1 — Requirements

```
Checklist:
☐  A Facebook Page (not a personal profile)
     Your business must have a Facebook Page, not a personal account
     [Create a Facebook Page ↗]

☐  You are an admin of that Facebook Page
     Editor or Moderator roles are not sufficient

☐  Messenger is enabled on the Page
     Settings → Messaging → Allow people to contact your Page
     [How to enable Messenger on a Facebook Page ↗]

If Instagram is already connected:
  "✓ You already have a Meta connection.
   Facebook Messenger uses the same connection."
  [Use existing Meta connection →] → skips to Step 3
```

---

### ✅ STEP 2 — Connect Meta

```
Same as WhatsApp Step 2.
Permissions:
  ✓ pages_messaging
  ✓ pages_read_engagement
  ✓ pages_manage_metadata
  ✓ pages_show_list
```

---

### ✅ STEP 3 — Select Facebook Page

```
Heading: "Choose your Facebook Page"

List of Pages from Meta account:
  [Simca Cleaning KE]   Category: Local Business   Followers: 1,204
  Radio to select

  If no Pages found:
    "No Facebook Pages found in this account."
    [Create a Facebook Page ↗]
    [Refresh list]

Bottom:
  [← Back]   [Continue →]
```

---

### ✅ STEP 4 — Configure

```
Heading: "Configure your Messenger experience"

SECTION: Get Started Button
  Label: "Message shown when someone clicks 'Send Message' on your Page"
  Textarea (pre-filled):
  "Welcome to Simca Cleaning! 👋 I'm your AI assistant.
   Ask me anything about our services, pricing, or bookings."
  Subtext: "This is the very first message a new visitor sees."

SECTION: Persistent Menu
  Label: "Quick-access menu inside every Messenger conversation"
  Subtext: "The ≡ icon in Messenger shows these options to customers
            at any point in the conversation."

  3 menu item inputs:
  ┌──────────────────────────────────────┐
  │ Menu item 1:  [🤖 Ask a Question  ]  │
  │ Sends:        [Hi, I have a question]│
  ├──────────────────────────────────────┤
  │ Menu item 2:  [📅 Book Appointment]  │
  │ Sends:        [I'd like to book]     │
  ├──────────────────────────────────────┤
  │ Menu item 3:  [👤 Talk to Someone  ] │
  │ Sends:        [I need human support] │
  └──────────────────────────────────────┘
  [+ Add menu item] (up to 3 top-level items)

  Toggle: "Enable sub-menus" — OFF by default (advanced)

SECTION: Ice Breakers
  Label: "Suggested questions shown in new conversations"
  4 input fields (same as Instagram)

SECTION: Rich Responses
  Toggle: "Use rich cards when presenting options" — ON
  Subtext: "When your AI lists services, packages, or options, it will
            display them as visual cards with images and buttons instead
            of plain text."

Bottom:
  [← Back]   [Connect Facebook Messenger →]
```

---

### ✅ POST-SETUP — Facebook Connected

```
✅ "Facebook Messenger is live!"

Summary:
  Page:              Simca Cleaning KE
  Get Started:       Active
  Persistent Menu:   3 items configured
  Ice breakers:      4 configured
  Rich responses:    Active

[View Messenger Conversations →]   [Test in Messenger →]
```

---

### ✅ Facebook Configure Panel (after connected)

```
TAB: General
  - Connected Page name
  - Page ID (Geist Mono)
  - [Open in Meta Business Suite ↗]
  - [Disconnect Facebook]

TAB: Messenger Profile
  - Get Started message
  - Ice breakers (4 inputs)
  - Persistent menu editor
  [Save & Sync to Meta]

TAB: Rich Responses
  - Toggle for rich cards
  - Toggle for carousels (multiple options)
  - Default card image (upload)

TAB: Behavior
  - 24-hour window handling
  - Response delay slider
  [Save Changes]
```

---
---

# CHANNEL 6 — SMS
## Choose Your Provider. Two Options.

---

## Pre-Connection Card

```
┌─────────────────────────────────────┐
│  📱  SMS                [● Not Connected] │
│  Reach customers via text message   │
│                                     │
│  ✓ Two-way SMS conversations        │
│  ✓ Ultra-concise AI responses       │
│  ✓ STOP/HELP compliance built-in    │
│                                     │
│  [Connect SMS →]                    │
└─────────────────────────────────────┘
```

---

## SMS Setup Wizard (4 Steps)

```
Steps: 1. Choose Provider   2. Enter Credentials   3. Configure   4. Test
```

---

### ✅ STEP 1 — Choose Provider

```
Heading: "Choose your SMS provider"
Subtext:  "NexaChat works with two SMS providers. We recommend
           Africa's Talking for Kenya and East Africa."

Two large option cards:

┌─────────────────────────────────────────────┐
│  🌍  Africa's Talking                       │
│  Recommended for Kenya & East Africa        │
│                                             │
│  ✓ Best delivery rates in Kenya/EA          │
│  ✓ Kenyan shortcodes available              │
│  ✓ M-Pesa SMS notifications (optional)      │
│  ✓ Affordable local pricing                 │
│                                             │
│  [Choose Africa's Talking]                  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  🌐  Twilio                                 │
│  Recommended for international / global     │
│                                             │
│  ✓ Works in 180+ countries                  │
│  ✓ Long codes and shortcodes available      │
│  ✓ Excellent global deliverability          │
│  ✓ Higher cost but widest coverage          │
│                                             │
│  [Choose Twilio]                            │
└─────────────────────────────────────────────┘

INFO BOX:
  "Not sure? If most of your customers are in Kenya,
   choose Africa's Talking. If you serve multiple countries,
   choose Twilio. You can switch providers later."
```

---

### ✅ STEP 2a — Enter Credentials (Africa's Talking path)

```
Heading: "Connect Africa's Talking"

INFO BOX:
  "You'll need an Africa's Talking account with SMS enabled.
   If you don't have one, create it at africastalking.com — it
   takes about 10 minutes and you can start with a sandbox."
  [Create Africa's Talking account ↗]

Input fields:
  Username:   [                        ]
  API Key:    [                        ]  [👁 Show/Hide]
  Subtext: "Found in your Africa's Talking dashboard → Settings → API Key"
  [Africa's Talking dashboard ↗]

Your SMS number / Sender ID:
  Option A: ○ Use a numeric shortcode (e.g., 21606)
              [Enter your shortcode: ________]
  Option B: ○ Use an alphanumeric sender ID (e.g., "SimcaClean")
              [Enter your sender ID: ________]
              Note: "Must be pre-registered with Africa's Talking"
  Option C: ○ Use a sandbox number for testing
              (only available in AT sandbox environment)

[Verify Credentials & Continue →]
  → API call to AT to verify the username/API key
  → If valid: green checkmark + account name confirmed
  → If invalid: "These credentials don't match an Africa's Talking
    account. Double-check your username and API key."
```

---

### ✅ STEP 2b — Enter Credentials (Twilio path)

```
Heading: "Connect Twilio"

INFO BOX:
  "You'll need a Twilio account with at least one active phone number."
  [Create a Twilio account ↗]

Input fields:
  Account SID:    [AC...                   ]  (from Twilio Console)
  Auth Token:     [                        ]  [👁 Show/Hide]
  Phone Number:   [+1...                   ]
  Subtext: "Found in your Twilio Console dashboard"
  [Twilio Console ↗]

[Verify Credentials & Continue →]
  → API call to Twilio to verify
  → If valid: green checkmark + number confirmed
  → If invalid: specific error message
```

---

### ✅ STEP 3 — Configure SMS Behavior

```
Heading: "Configure your SMS AI"
Subtext:  "SMS has strict limits. Your AI automatically keeps responses
           under 320 characters and uses plain text only."

SECTION: Response Style (read-only — for owner awareness)
  INFO BOX (light blue):
  "SMS AI rules applied automatically:
   ✓ Max 320 characters per response (2 SMS segments)
   ✓ No emojis, no bold, no bullet points
   ✓ Plain conversational text only
   ✓ Numbers for choices: 'Reply 1 for X, 2 for Y'
   ✓ Link shortener applied to all URLs (nxc.to/xxxxx)"

SECTION: Opt-out Compliance (read-only — these are automatic)
  INFO BOX (yellow):
  "The following are handled automatically and cannot be disabled
   (required by SMS carriers):
   ✓ STOP → immediately unsubscribes the number
   ✓ START → re-subscribes
   ✓ HELP → sends your business name + support contact"

  HELP response customization (editable):
  "[Business Name] Support. For help: [website]. To unsubscribe, reply STOP."
  Character counter: 89/160

SECTION: First Message Footer
  Toggle: "Add compliance footer to first SMS in any campaign" — ON (locked)
  Preview: "[Message content] Reply STOP to unsubscribe."
  Subtext: "Required for campaign messages. Cannot be disabled for
            campaigns, but is not added to conversational replies."

SECTION: Short Link Domain
  Label: "Links in SMS responses will be shortened automatically."
  Preview: "Your links will appear as: nxc.to/a3f9b"
  Toggle: "Enable link shortening" — ON

Bottom:
  [← Back]   [Continue →]
```

---

### ✅ STEP 4 — Test

```
Heading: "Test your SMS channel"

┌─────────────────────────────────────────────────┐
│  📱  Send a test SMS                            │
│                                                 │
│  Your SMS number: +254 769 000 000              │
│  (or shortcode: 21606)                          │
│                                                 │
│  1. Text this number from your phone:           │
│     Any question related to your business       │
│                                                 │
│  Waiting for test message...  ⏳                │
│                                                 │
└─────────────────────────────────────────────────┘

When test SMS received:
  ✓ "Test SMS received!"
  ✓ Platform sends AI response back to your phone
  "Did you receive the reply on your phone? Check that it
   arrived within 30 seconds."
  [Yes, it worked! →]  [I didn't receive anything — help me]

[Finish Setup →]
```

---

### ✅ POST-SETUP — SMS Connected

```
✅ "SMS is live!"

Summary:
  Provider:   Africa's Talking
  Number:     Shortcode 21606
  Compliance: STOP/HELP/START active
  Link URLs:  Shortened automatically

[Go to Inbox →]   [Create an SMS Campaign →]
```

---

### ✅ SMS Configure Panel (after connected)

```
TAB: General
  - Provider + number
  - Credentials (masked, [Update Credentials] button)
  - [Test SMS delivery]
  - [Disconnect SMS]

TAB: Compliance
  - HELP message editor
  - Opt-out list (view/export opted-out numbers)
  - [Import opt-out list] (CSV)

TAB: Behavior
  - Character limit setting
  - Link shortening toggle
  - HELP message
  [Save Changes]
```

---
---

# ✅ MULTI-CHANNEL COORDINATION — WHAT HAPPENS AFTER ALL CHANNELS CONNECT

---

## The Channels Page — Fully Connected State

```
┌──────────────────┐  ┌──────────────────┐
│ 🌐 Web Widget    │  │ 💬 WhatsApp      │
│ ● Connected      │  │ ● Connected      │
│ +254 700 000 000 │  │ +254 700 000 000 │
│ [Configure]      │  │ [Configure]      │
└──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐
│ 📧 Email         │  │ 📸 Instagram     │
│ ● Connected      │  │ ● Connected      │
│ support@simca... │  │ @simcacleaning   │
│ [Configure]      │  │ [Configure]      │
└──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐
│ 💙 Facebook      │  │ 📱 SMS           │
│ ● Connected      │  │ ● Connected      │
│ Simca Cleaning.. │  │ Shortcode 21606  │
│ [Configure]      │  │ [Configure]      │
└──────────────────┘  └──────────────────┘

BANNER BELOW GRID (success state):
┌──────────────────────────────────────────────────────────────┐
│  🎉  All 6 channels are live. Your AI is answering customers │
│  everywhere they message you.                                │
│  [View Unified Inbox →]                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## ✅ Channel Status States (Reference)

```
Every channel card can be in one of these states:

● Connected (green)     — fully active, receiving messages
⏳ Connecting           — OAuth/API verification in progress
⚠ Needs attention       — connected but has an issue (e.g., template
                          rejected, credential expired, webhook error)
✗ Error (red)           — completely disconnected due to an error
○ Not connected (grey)  — never been connected
🔒 Locked               — requires plan upgrade

"Needs attention" examples and resolutions:
  ⚠ "WhatsApp access token expired" → [Reconnect Meta]
  ⚠ "1 message template rejected"   → [Review rejection reason]
  ⚠ "Instagram permission revoked"  → [Reauthorize Instagram]
  ⚠ "Email forwarding stopped"      → [Check DNS settings]
  ⚠ "Twilio balance low ($2.14)"    → [Top up Twilio account ↗]
  ⚠ "SMS delivery failing (47%)"    → [View failed messages]
```

---

## Channel Health Dashboard

```
Accessible via [View Channel Health] in the Channels page header.

Table view:
Channel     | Status    | Messages Today | Delivery Rate | Last Error  | Action
────────────────────────────────────────────────────────────────────────────────
Web Widget  | ● Active  | 34             | N/A           | —           | —
WhatsApp    | ● Active  | 127            | 98.4%         | —           | —
Email       | ● Active  | 12             | 100%          | —           | —
Instagram   | ● Active  | 8              | 100%          | —           | —
Facebook    | ⚠ Warning | 3              | 72.1%         | Token exp.  | Reconnect
SMS         | ● Active  | 41             | 94.2%         | —           | —

Clicking any row → channel-specific health detail:
  Last 50 message delivery attempts with status
  Error log with timestamps
  Quick fix actions
```

---

## Disconnect Flow (Any Channel)

```
Triggered by [Disconnect] button on any configured channel panel.

Modal:
  ┌──────────────────────────────────────────────────────────┐
  │  ⚠  Disconnect WhatsApp?                                │
  │                                                          │
  │  This will:                                              │
  │  • Stop your AI from receiving WhatsApp messages         │
  │  • Stop your AI from sending WhatsApp replies            │
  │  • Preserve all existing conversation history            │
  │  • NOT delete any contacts or leads captured on WhatsApp │
  │                                                          │
  │  You can reconnect WhatsApp at any time.                 │
  │                                                          │
  │  [Cancel]             [Disconnect WhatsApp]              │
  │                        (red button)                      │
  └──────────────────────────────────────────────────────────┘

After disconnect:
  Card returns to "● Not Connected" state
  All historical conversations preserved
  Contacts retain their WhatsApp channel badge (historical)
  Toast: "WhatsApp disconnected. All history preserved."
```

---

## Onboarding Integration — Where Channels First Appear

```
During the 6-step onboarding wizard (Step 5: Install & Channels):

  After completing the web widget installation, the owner sees:

  "Your web widget is live ✓

   Want to connect more channels? Your AI can handle
   WhatsApp, Email, Instagram, Facebook, and SMS too —
   all from the same inbox.

   [Connect WhatsApp →]  ← most prominent button
   [Connect Email →]
   [Skip — I'll connect more channels later]"

  Clicking any channel opens that channel's wizard in a modal.
  Completing it returns them to the onboarding flow.
  Skip continues to Step 6 (Review & Launch).

  The Dashboard Overview also shows a channel completion prompt:
  "You're using 1 of 6 channels.
   Connect WhatsApp to reach 67% more customers. [Connect →]"
```

---

*This document covers the complete owner-facing integration UI for all 6 channels. Implement alongside Milestone 9 backend work in the main plan. The backend (webhook handlers, OAuth token storage, API calls) is in the main plan. This document is the frontend and UX layer that sits on top of it.*
