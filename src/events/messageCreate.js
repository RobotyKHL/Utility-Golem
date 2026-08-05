const db = require('../database/db');
const automod = require('../modules/automod/automodHandler');
const { createEmbed } = require('../utils/embedBuilder');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // 1. Run Automod Check
    const triggered = await automod.handleAutomod(message);
    if (triggered) return;

    const guildId = message.guild.id;
    const settings = db.getGuildSettings(guildId);
    const prefix = settings.prefix || "g!";

    // 2. Leveling Module
    if (db.isModuleEnabled(guildId, 'leveling')) {
      const userLevel = db.getUserLevel(guildId, message.author.id);
      const now = Date.now();
      const cooldownMs = (settings.levelingCooldown || 60) * 1000;
      
      if (now - userLevel.last_message_time > cooldownMs) {
        const xpGained = Math.floor(Math.random() * 10) + 15; // 15 to 25 XP
        let newXp = userLevel.xp + xpGained;
        let newLevel = userLevel.level;
        
        // XP Formula: Level * 100 + 100
        let xpNeeded = (newLevel * 100) + 100;
        let leveledUp = false;
        
        while (newXp >= xpNeeded) {
          newXp -= xpNeeded;
          newLevel++;
          xpNeeded = (newLevel * 100) + 100;
          leveledUp = true;
        }

        db.saveUserLevel(guildId, message.author.id, newXp, newLevel, now);

        if (leveledUp) {
          // Check for rewards
          const rewards = db.getLevelRewards(guildId);
          const roleId = rewards[newLevel];
          let rewardText = "";
          
          if (roleId) {
            const role = message.guild.roles.cache.get(roleId);
            if (role) {
              const member = message.guild.members.cache.get(message.author.id);
              if (member) {
                await member.roles.add(role).catch(() => {});
                rewardText = ` and unlocked the **${role.name}** role`;
              }
            }
          }

          message.channel.send({
            embeds: [createEmbed({
              title: "Level Up!",
              description: `Congratulations ${message.author}! You have reached **Level ${newLevel}**${rewardText}!`,
              color: '#2ed573'
            })]
          });
        }
      }
    }

    // 3. Custom Commands Check
    if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      
      const customCmds = db.getCustomCommands(guildId);
      if (customCmds[commandName]) {
        const cmd = customCmds[commandName];
        let response = cmd.response;
        
        // Parse basic variables
        response = response
          .replace(/{user}/g, message.author.toString())
          .replace(/{username}/g, message.author.username)
          .replace(/{server}/g, message.guild.name)
          .replace(/{membercount}/g, message.guild.memberCount);

        if (cmd.is_embed === 1) {
          return message.reply({
            embeds: [createEmbed({
              description: response
            })]
          });
        } else {
          return message.reply(response);
        }
      }
    }
  }
};
