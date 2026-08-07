const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'golem_db.json');
const configPath = path.join(process.cwd(), 'config.json');

// Read config.json fresh every time (so edits take effect without restart)
function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    logger.error(`Failed to read config.json: ${e.message}`);
  }
  return {};
}

// Memory cache for database content
let data = {
  guild_settings: {},
  moderation_logs: [],
  warnings: [],
  giveaways: {},
  suggestions: {},
  tickets: {},
  custom_commands: {}, // guildId -> { cmdName: { response, is_embed } }
  levels: {}, // guildId -> { userId: { xp, level, last_message_time } }
  level_rewards: {}, // guildId -> { level: roleId }
  starboard_messages: {}, // original_msg_id -> { starboard_msg_id, guild_id, star_count }
  automod_settings: {}
};

// Save database atomatically
function save() {
  try {
    const tempPath = dbPath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, dbPath);
  } catch (err) {
    logger.error(`Failed to save database: ${err.message}`);
  }
}

// Load database
function init() {
  logger.info(`Initializing JSON database at ${dbPath}`);
  if (fs.existsSync(dbPath)) {
    try {
      const fileData = fs.readFileSync(dbPath, 'utf8');
      const parsed = JSON.parse(fileData);
      data = { ...data, ...parsed };
      logger.success('Database loaded successfully.');
    } catch (err) {
      logger.error(`Failed to parse database file: ${err.message}. Creating backup and resetting.`);
      try {
        fs.renameSync(dbPath, dbPath + `.backup-${Date.now()}`);
      } catch (_) {}
      save();
    }
  } else {
    save();
    logger.success('New database file created.');
  }
}

// Settings Cache
function getGuildSettings(guildId) {
  // Always merge config.json values on top of whatever is in the database
  const config = getConfig();

  if (!data.guild_settings[guildId]) {
    const defaultConfig = require('../config/default');
    const defaults = defaultConfig.defaultSettings;
    const allModules = [
      'moderation', 'automod', 'logging', 'welcome', 'roles',
      'tickets', 'suggestions', 'giveaways', 'leveling', 'minecraft', 'utility', 'starboard'
    ];

    data.guild_settings[guildId] = {
      guild_id: guildId,
      welcome_enabled: defaults.welcomeEnabled,
      welcome_channel: defaults.welcomeChannel,
      welcome_message: defaults.welcomeMessage,
      goodbye_enabled: defaults.goodbyeEnabled,
      goodbye_channel: defaults.goodbyeChannel,
      goodbye_message: defaults.goodbyeMessage,
      autorole_enabled: defaults.autoRoleEnabled,
      autoroles: defaults.autoRoles,
      logging_enabled: defaults.loggingEnabled,
      logging_channel: defaults.loggingChannel,
      log_events: defaults.logEvents,
      starboard_enabled: defaults.starboardEnabled,
      starboard_channel: defaults.starboardChannel,
      starboard_threshold: defaults.starboardThreshold,
      suggestion_enabled: defaults.suggestionEnabled,
      suggestion_channel: defaults.suggestionChannel,
      ticket_enabled: defaults.ticketEnabled,
      ticket_category: defaults.ticketCategory,
      ticket_logs_channel: defaults.ticketLogsChannel,
      leveling_enabled: defaults.levelingEnabled,
      minecraft_enabled: defaults.minecraftEnabled,
      minecraft_ip: defaults.minecraftIp,
      minecraft_port: defaults.minecraftPort,
      enabled_modules: JSON.stringify(allModules)
    };
    save();
  }

  const settings = data.guild_settings[guildId];

  // Safely overlay config.json channels and prefix on top of the database values
try {
      if (config.channels) {
        if (config.channels.logs)         settings.logging_channel     = config.channels.logs;
        if (config.channels.welcome)      settings.welcome_channel     = config.channels.welcome;
        if (config.channels.goodbye)      settings.goodbye_channel     = config.channels.goodbye;
        if (config.channels.suggestions)  settings.suggestion_channel  = config.channels.suggestions;
        if (config.channels.tickets)      settings.ticket_logs_channel = config.channels.tickets;
      }
      if (config.guild && config.guild.prefix) {
        settings.prefix = config.guild.prefix;
      }
      // config.json is the source of truth: enabling the welcome module with a
      // channel configured implies welcome/goodbye messages should be active.
      if (config.modules) {
        const welcomeModule = config.modules.welcome === true;
        if (welcomeModule && config.channels && config.channels.welcome) {
          settings.welcome_enabled = 1;
        }
        if (welcomeModule && config.channels && config.channels.goodbye) {
          settings.goodbye_enabled = 1;
        }
      }
      // Editable welcome/goodbye message templates from config.json
      if (config.messages) {
        if (config.messages.welcome)  settings.welcome_message  = config.messages.welcome;
        if (config.messages.goodbye)  settings.goodbye_message  = config.messages.goodbye;
      }
    } catch (e) {
    logger.error(`Error applying config.json overrides: ${e.message}`);
  }

  return settings;
}

function updateGuildSettings(guildId, key, value) {
  const settings = getGuildSettings(guildId);
  settings[key] = value;
  save();
}

function isModuleEnabled(guildId, moduleName) {
  // Read from config.json first — it is the source of truth
  const config = getConfig();
  if (config.modules && config.modules.hasOwnProperty(moduleName)) {
    return config.modules[moduleName] === true;
  }
  // Fallback to database if somehow not in config
  const settings = getGuildSettings(guildId);
  if (!settings) return false;
  try {
    const modules = JSON.parse(settings.enabled_modules || '[]');
    return modules.includes(moduleName);
  } catch (e) {
    return false;
  }
}

// Automod Settings helper
function getAutomodSettings(guildId) {
  if (!data.automod_settings[guildId]) {
    data.automod_settings[guildId] = {
      guild_id: guildId,
      anti_spam: 0,
      anti_invite: 0,
      anti_caps: 0,
      anti_mentions: 0,
      bad_words: '[]',
      duplicate_detection: 0,
      raid_protection: 0
    };
    save();
  }
  return data.automod_settings[guildId];
}

function updateAutomodSettings(guildId, key, value) {
  const settings = getAutomodSettings(guildId);
  settings[key] = value;
  save();
}

// Moderation Logs helpers
function addModLog(guildId, userId, moderatorId, actionType, reason) {
  const log = {
    id: data.moderation_logs.length + 1,
    guild_id: guildId,
    user_id: userId,
    moderator_id: moderatorId,
    action_type: actionType,
    reason: reason || 'No reason provided',
    timestamp: Date.now()
  };
  data.moderation_logs.push(log);
  save();
  return log;
}

function getModLogs(guildId) {
  return data.moderation_logs.filter(log => log.guild_id === guildId);
}

// Warnings Helpers
function addWarning(guildId, userId, moderatorId, reason) {
  const warning = {
    id: data.warnings.length + 1,
    guild_id: guildId,
    user_id: userId,
    moderator_id: moderatorId,
    reason: reason || 'No reason provided',
    timestamp: Date.now()
  };
  data.warnings.push(warning);
  save();
  return warning;
}

function getWarnings(guildId, userId) {
  return data.warnings.filter(w => w.guild_id === guildId && w.user_id === userId);
}

function clearWarnings(guildId, userId) {
  const originalLength = data.warnings.length;
  data.warnings = data.warnings.filter(w => !(w.guild_id === guildId && w.user_id === userId));
  save();
  return originalLength - data.warnings.length;
}

// Giveaway Helpers
function saveGiveaway(giveaway) {
  data.giveaways[giveaway.message_id] = giveaway;
  save();
}

function getGiveaway(messageId) {
  return data.giveaways[messageId];
}

function getActiveGiveaways() {
  return Object.values(data.giveaways).filter(g => g.ended === 0);
}

function getAllGiveaways() {
  return Object.values(data.giveaways);
}

// Suggestions Helpers
function saveSuggestion(suggestion) {
  data.suggestions[suggestion.message_id] = suggestion;
  save();
}

function getSuggestion(messageId) {
  return data.suggestions[messageId];
}

function getAllSuggestions(guildId) {
  return Object.values(data.suggestions).filter(s => s.guild_id === guildId);
}

// Tickets Helpers
function saveTicket(ticket) {
  data.tickets[ticket.channel_id] = ticket;
  save();
}

function getTicket(channelId) {
  return data.tickets[channelId];
}

function getAllTickets(guildId) {
  return Object.values(data.tickets).filter(t => t.guild_id === guildId);
}

// Custom Commands Helpers
function saveCustomCommand(guildId, name, response, isEmbed = 0) {
  if (!data.custom_commands[guildId]) {
    data.custom_commands[guildId] = {};
  }
  data.custom_commands[guildId][name.toLowerCase()] = { response, is_embed: isEmbed };
  save();
}

function deleteCustomCommand(guildId, name) {
  if (data.custom_commands[guildId] && data.custom_commands[guildId][name.toLowerCase()]) {
    delete data.custom_commands[guildId][name.toLowerCase()];
    save();
    return true;
  }
  return false;
}

function getCustomCommands(guildId) {
  return data.custom_commands[guildId] || {};
}

// Leveling Helpers
function getUserLevel(guildId, userId) {
  if (!data.levels[guildId]) {
    data.levels[guildId] = {};
  }
  if (!data.levels[guildId][userId]) {
    data.levels[guildId][userId] = { xp: 0, level: 0, last_message_time: 0 };
  }
  return data.levels[guildId][userId];
}

function saveUserLevel(guildId, userId, xp, level, lastMessageTime) {
  if (!data.levels[guildId]) {
    data.levels[guildId] = {};
  }
  data.levels[guildId][userId] = { xp, level, last_message_time: lastMessageTime };
  save();
}

function getLeaderboard(guildId) {
  if (!data.levels[guildId]) return [];
  return Object.entries(data.levels[guildId]).map(([userId, stats]) => ({
    user_id: userId,
    ...stats
  })).sort((a, b) => {
    if (b.level !== a.level) {
      return b.level - a.level;
    }
    return b.xp - a.xp;
  });
}

function saveLevelReward(guildId, level, roleId) {
  if (!data.level_rewards[guildId]) {
    data.level_rewards[guildId] = {};
  }
  data.level_rewards[guildId][level] = roleId;
  save();
}

function getLevelRewards(guildId) {
  return data.level_rewards[guildId] || {};
}

function deleteLevelReward(guildId, level) {
  if (data.level_rewards[guildId] && data.level_rewards[guildId][level]) {
    delete data.level_rewards[guildId][level];
    save();
    return true;
  }
  return false;
}

// Starboard Helpers
function saveStarboardMessage(originalMsgId, starboardMsgId, guildId, starCount) {
  data.starboard_messages[originalMsgId] = { starboard_msg_id: starboardMsgId, guild_id: guildId, star_count: starCount };
  save();
}

function getStarboardMessage(originalMsgId) {
  return data.starboard_messages[originalMsgId];
}

module.exports = {
  db: {
    prepare: (sql) => {
      // Mock db.prepare for backwards compatibility where direct raw queries are executed
      return {
        all: (guildId) => {
          if (sql.includes('moderation_logs')) {
            return getModLogs(guildId);
          }
          return [];
        }
      };
    }
  },
  init,
  getGuildSettings,
  updateGuildSettings,
  isModuleEnabled,
  getAutomodSettings,
  updateAutomodSettings,
  addModLog,
  getModLogs,
  addWarning,
  getWarnings,
  clearWarnings,
  saveGiveaway,
  getGiveaway,
  getActiveGiveaways,
  getAllGiveaways,
  saveSuggestion,
  getSuggestion,
  getAllSuggestions,
  saveTicket,
  getTicket,
  getAllTickets,
  saveCustomCommand,
  deleteCustomCommand,
  getCustomCommands,
  getUserLevel,
  saveUserLevel,
  getLeaderboard,
  saveLevelReward,
  getLevelRewards,
  deleteLevelReward,
  saveStarboardMessage,
  getStarboardMessage
};
