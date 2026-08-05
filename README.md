# Golem - Discord Server Guardian

Golem is a custom, modular Discord server management bot built on Node.js, discord.js v14, and a pure JavaScript JSON database wrapper. It's designed to replace Carl-bot, Sapphire, and others with modularity, custom branding, and extreme stability.

---

## 🚀 Features

1. **Moderation Module:** `/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`, `/warn`, `/clear`, `/lock`, `/unlock`, `/slowmode` with robust REST-API bypasses for caching issues.
2. **Automod Module:** Anti-spam, bad word filters, cap filters, excessive mentions filters, duplicate message detection.
3. **Logging System:** Comprehensive logs for mod actions.
4. **Interactive Roles:** Deploy dropdown role selection menus and auto-roles.
5. **Support Tickets:** Create support ticket buttons, automatic channels with staff permissions, and transcript logging.
6. **Giveaways Manager:** Time-scheduled giveaways with rolling winners, rerolling options, and database persistence.
7. **Leveling System:** Exp gain on message cooldown, `/level rank` command with text progress bar, server leaderboard, and role rewards!
8. **Minecraft Integration:** Query server statuses, versions, MOTDs, and player lists natively.
9. **Built-in Web Dashboard:** A beautiful, dark-themed local web dashboard served directly from the bot for toggling modules and viewing stats.
10. **Auto-Update Bootstrap:** Native support for Pterodactyl panels to auto-pull the latest code on restart.

---

## ⚙️ Configuration System (`config.json`)

Golem features a manual configuration file that automatically generates in your root directory. It allows you to:
- Route Level Up messages to a specific channel.
- Restrict specific slash commands (like `/level` or `/giveaway`) so they can only be used in specific channels.

**Example `config.json`:**
```json
{
  "levelUpChannel": "123456789012345678",
  "commandChannels": {
    "level": ["102837461928374", "987654321098765"],
    "giveaway": ["123456789012345678"]
  }
}
```
*Note: Make sure channel IDs are wrapped in double quotes `" "` to prevent Discord ID corruption! Commands not listed in this file will work in all channels.*

---

## 🛠️ Installation Guide

### Option 1: Pterodactyl Panel (Auto-Updater)
1. In your Pterodactyl File Manager, upload `package.json` and `index.js` from the `bootstrap/` folder in this repo.
2. Set your Startup Command to `npm start`.
3. Create a `.env` file with:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `API_KEY` (Your custom password to access the web dashboard)
4. Start the server! The bootstrap will automatically download the `src/` folder from GitHub, install packages, and launch the bot. 
5. To update your bot in the future, just delete the `src` folder and restart!

### Option 2: Local / VPS Hosting
1. **Clone or Download** this directory.
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:**
   Rename `.env.example` to `.env` and fill in your `DISCORD_TOKEN`, `CLIENT_ID`, and `API_KEY`.
4. **Start Bot:**
   ```bash
   npm run dev
   ```

---

## 🌐 Web Dashboard
Golem runs a Web Dashboard and API on port `3000` (configurable via `PORT` in `.env`).
To access the dashboard:
1. Ensure port 3000 is forwarded/open on your host.
2. Visit `http://<your-server-ip>:3000` in your browser.
3. Enter the `API_KEY` you defined in your `.env` file to log in.
4. Toggle modules, view stats, and check moderation logs directly from the web!
