const db = require('../database/db');
const { createEmbed } = require('../utils/embedBuilder');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (oldMessage.author?.bot || !oldMessage.guild) return;
    if (oldMessage.content === newMessage.content) return; // Ignore pin updates or embed updates

    const guildId = oldMessage.guild.id;
    if (!db.isModuleEnabled(guildId, 'logging')) return;

    const settings = db.getGuildSettings(guildId);
    if (settings.logging_enabled !== 1 || !settings.logging_channel) return;

    try {
      const events = JSON.parse(settings.log_events || '{}');
      if (!events.messageEdit) return;

      const logChannel = oldMessage.guild.channels.cache.get(settings.logging_channel);
      if (logChannel) {
        logChannel.send({
          embeds: [createEmbed({
            title: "Message Edited",
            description: `**Author:** ${oldMessage.author} (${oldMessage.author.id})\n**Channel:** ${oldMessage.channel}\n[Jump to Message](${newMessage.url})`,
            fields: [
              { name: "Before", value: oldMessage.content || "*No content*" },
              { name: "After", value: newMessage.content || "*No content*" }
            ],
            color: '#ffa502'
          })]
        }).catch(() => {});
      }
    } catch (err) {}
  }
};
