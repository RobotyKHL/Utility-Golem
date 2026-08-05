require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const logger = require('./utils/logger');
const db = require('./database/db');

// Setup Database
db.init();

// Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ]
});

client.commands = new Collection();
client.cooldowns = new Collection();

// Express API Server Setup (Dashboard Ready)
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// API Auth Middleware
const apiAuth = (req, res, next) => {
  const apiKey = req.headers['authorization'];
  if (!apiKey || apiKey !== `Bearer ${process.env.API_KEY || 'default_secret'}`) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
  next();
};

// API Endpoints
app.get('/api/info', apiAuth, (req, res) => {
  res.json({
    botName: "Golem",
    guildsCount: client.guilds.cache.size,
    usersCount: client.users.cache.size,
    uptime: process.uptime(),
    status: client.presence.status
  });
});

app.get('/api/guilds/:guildId/settings', apiAuth, (req, res) => {
  const settings = db.getGuildSettings(req.params.guildId);
  if (!settings) return res.status(404).json({ error: 'Guild not found' });
  res.json(settings);
});

app.post('/api/guilds/:guildId/settings', apiAuth, (req, res) => {
  const { guildId } = req.params;
  const updates = req.body;
  
  try {
    for (const [key, value] of Object.entries(updates)) {
      db.updateGuildSettings(guildId, key, typeof value === 'object' ? JSON.stringify(value) : value);
    }
    res.json({ success: true, settings: db.getGuildSettings(guildId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/guilds/:guildId/logs', apiAuth, (req, res) => {
  const logs = db.db.prepare('SELECT * FROM moderation_logs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT 100').all(req.params.guildId);
  res.json(logs);
});

// Start API Server
app.listen(PORT, () => {
  logger.success(`Dashboard API Server running on port ${PORT}`);
});

// Load Event Handlers
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
  logger.info(`Loaded ${eventFiles.length} event listener(s).`);
}

// Load Command Files
const commandsPath = path.join(__dirname, 'commands');
const commandList = [];

function loadCommands(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      loadCommands(filePath);
    } else if (file.endsWith('.js')) {
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandList.push(command.data.toJSON());
      } else {
        logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
  }
}
loadCommands(commandsPath);
logger.info(`Loaded ${client.commands.size} command(s).`);

// Register Slash Commands Deploy Function
client.deployCommands = async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    logger.info('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commandList },
    );
    logger.success('Successfully reloaded application (/) commands.');
  } catch (error) {
    logger.error(`Error deploying slash commands: ${error.message}`);
  }
};

// Error Handling (Prevent Bot Crash)
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}\nStack: ${error.stack}`);
});

if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    logger.error(`Discord login failed: ${err.message}`);
  });
} else {
  logger.warn("No DISCORD_TOKEN found in .env. Bot is running in offline/API mode.");
}

module.exports = client;
