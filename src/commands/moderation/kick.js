const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { createEmbed } = require('../../utils/embedBuilder');

module.exports = {
  module: 'moderation',
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a member from the server')
    .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for kicking'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
    const guild = interaction.guild ?? await interaction.client.guilds.fetch(interaction.guildId).catch(() => null);
    if (!guild) return interaction.reply({ content: 'Could not load server data.', flags: 64 });

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: "That user is not in the server.", flags: 64 });
    }

    if (!member.kickable) {
      return interaction.reply({ content: "I cannot kick this user.", flags: 64 });
    }

    await member.kick(reason);
    
    // Add mod log
    db.addModLog(guild.id, user.id, interaction.user.id, 'KICK', reason);

    // Logging to channel
    const settings = db.getGuildSettings(guild.id);
    if (settings.logging_enabled === 1 && settings.logging_channel) {
      const events = JSON.parse(settings.log_events || '{}');
      if (events.kick) {
        const logChannel = guild.channels.cache.get(settings.logging_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [createEmbed({
              title: "User Kicked",
              description: `**User:** ${user} (${user.tag})\n**Moderator:** ${interaction.user}\n**Reason:** ${reason}`,
              color: '#ff4757'
            })]
          }).catch(() => {});
        }
      }
    }

    return interaction.reply({
      embeds: [createEmbed({
        title: "User Kicked",
        description: `Successfully kicked **${user.tag}**.\n**Reason:** ${reason}`,
        color: '#ff4757'
      })]
    });
  }
};
