const db = require('../database/db');
const { createEmbed } = require('../utils/embedBuilder');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    if (oldState.member.user.bot) return;

    const guildId = oldState.guild.id;
    if (!db.isModuleEnabled(guildId, 'logging')) return;

    const settings = db.getGuildSettings(guildId);
    if (settings.logging_enabled !== 1 || !settings.logging_channel) return;

    try {
      const events = JSON.parse(settings.log_events || '{}');
      if (!events.voice) return;

      const logChannel = oldState.guild.channels.cache.get(settings.logging_channel);
      if (!logChannel) return;

      const user = oldState.member.user;

      if (!oldState.channelId && newState.channelId) {
        // User joined voice channel
        logChannel.send({
          embeds: [createEmbed({
            title: "Voice Channel Joined",
            description: `${user} joined **${newState.channel.name}**`,
            color: '#2ed573'
          })]
        }).catch(() => {});
      } else if (oldState.channelId && !newState.channelId) {
        // User left voice channel
        logChannel.send({
          embeds: [createEmbed({
            title: "Voice Channel Left",
            description: `${user} left **${oldState.channel.name}**`,
            color: '#ff4757'
          })]
        }).catch(() => {});
      } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        // User switched voice channel
        logChannel.send({
          embeds: [createEmbed({
            title: "Voice Channel Switched",
            description: `${user} moved from **${oldState.channel.name}** to **${newState.channel.name}**`,
            color: '#ffa502'
          })]
        }).catch(() => {});
      }
    } catch (err) {}
  }
};
