# Golem - Discord Server Guardian

Golem is a custom, modular Discord server management bot built on Node.js, discord.js v14, and a pure JavaScript JSON database wrapper. It's designed to replace Carl-bot, Sapphire, and others with modularity, custom branding, and extreme stability suitable for free hosting.

---

## 🚀 Features

1. **Moderation Module:** `/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`, `/warn`, `/warnings`, `/clear`, `/lock`, `/unlock`, `/slowmode` with mod logging.
2. **Automod Module:** Anti-spam, anti-invite links, bad word filters, cap filters, excessive mentions filters, duplicate message detection.
3. **Logging System:** Comprehensive logs for message deletes, message edits, member joins/leaves, role updates, channel edits, voice state switches.
4. **Welcome / Goodbye System:** Embed messages with custom tags (`{user}`, `{username}`, `{server}`, `{membercount}`) and role auto-assignment.
5. **Interactive Roles:** Deploy button roles, dropdown role selection menus, and verification gateways.
6. **Support Tickets:** Create support ticket buttons, automatic channels with staff permissions, and transcript logging.
7. **Suggestions Box:** Voting buttons (upvote/downvote) and staff approval flow.
8. **Giveaways Manager:** Time-scheduled giveaways with rolling winners, rerolling options, and database persistence.
9. **Leveling System:** Exp gain on message cooldown, `/level rank` command with text progress bar, server leaderboard, and level rewards.
10. **Minecraft Integration:** Query server statuses, versions, MOTDs, and player lists natively.
11. **Dashboard-Ready API:** Runs an API on startup to query bot data, settings, and logs.

---

## 🛠️ Installation Guide

Follow these steps to deploy Golem on your server:

### Prerequisite
Make sure you have [Node.js (v18.0.0 or higher)](https://nodejs.org/) installed.

### Setup Steps
1. **Clone or Download** this directory.
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:**
   Rename `.env.example` to `.env` and fill in the credentials:
   - `DISCORD_TOKEN`: Go to [Discord Developer Portal](https://discord.com/developers/applications), create a Bot application, copy the Token.
   - `CLIENT_ID`: Copy the Application ID of your bot from the Discord Developer Portal.
   - `API_KEY`: Set a secure secret key for accessing the API (e.g. `golem_secret_123`).
   - `DATABASE_PATH`: Set path for database (defaults to `./golem_db.json`).
4. **Bot Permissions & Intents:**
   In the developer portal under the **Bot** tab, enable:
   - **Presence Intent**
   - **Server Members Intent**
   - **Message Content Intent**
5. **Start Bot:**
   ```bash
   npm start
   ```

---

## 🌐 Hosting Guide (Free Platforms)

Golem is extremely lightweight and requires no native binary compilers, making it perfect for free tiers:

### 1. Render.com (Recommended)
- Create a free account at [Render](https://render.com/).
- Link your GitHub repository.
- Select **Web Service**.
- Configure:
  - **Runtime:** `Node`
  - **Build Command:** `npm install`
  - **Start Command:** `npm start`
- Go to the **Environment** tab, click **Add Environment Variable**, and insert your `.env` values (`DISCORD_TOKEN`, `CLIENT_ID`, etc.).
- Render's free tier sleeps after 15 minutes of inactivity. Since Discord connections keep the bot awake, you can ping your API endpoint URL (e.g., `https://golem-bot.onrender.com/api/info` with headers) to prevent sleeping, or use a cron check.

### 2. Railway.app
- Create an account on [Railway](https://railway.app/).
- Click **New Project** -> **Deploy from GitHub repo**.
- Add variables under the **Variables** tab matching your `.env` file.
- Deploy. Railway handles the start commands automatically.

### 3. Fly.io
- Install `flyctl` CLI tool.
- Run `fly launch` in the project directory.
- Configure port variables.
- Deploy.

---

## 🧬 API Documentation (Dashboard Ready)

Golem runs an API server on port 3000 (configurable via `PORT` in `.env`).

All endpoints require authorization via headers:
`Authorization: Bearer <your_api_key_from_env>`

- **GET `/api/info`:** Retrieve server statistics (uptime, guild count, status).
- **GET `/api/guilds/:guildId/settings`:** Get configured modules and system settings.
- **POST `/api/guilds/:guildId/settings`:** Update settings values dynamically.
- **GET `/api/guilds/:guildId/logs`:** Query moderation audit trail.
