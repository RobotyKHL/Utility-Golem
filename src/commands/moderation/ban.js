const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { createEmbed } = require('../../utils/embedBuilder');

module.exports = {
  module: 'moderation',
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a member from the server')
    .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for banning'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    // Must be run inside a guild
    if (!interaction.guild) {
      return interaction.reply({ content: "This command can only be used inside a server.", flags: 64 });
    }

    const user   = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Prevent banning yourself or the bot
    if (user.id === interaction.user.id) {
      return interaction.reply({ content: "You cannot ban yourself.", flags: 64 });
    }
    if (user.id === interaction.client.user.id) {
      return interaction.reply({ content: "I cannot ban myself.", flags: 64 });
    }

    // Fetch the member from the API (not just cache) so it's always up-to-date
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member) {
      if (!member.bannable) {
        return interaction.reply({ content: "I cannot ban this user — they may have a higher role than me.", flags: 64 });
      }
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ content: "You cannot ban someone with an equal or higher role than you.", flags: 64 });
      }
    }

    try {
      await interaction.guild.members.ban(user, { reason: `${interaction.user.tag}: ${reason}` });

      // Log event (guildBanAdd event handles the channel log automatically)
      db.addModLog(interaction.guild.id, user.id, interaction.user.id, 'BAN', reason);

      return interaction.reply({
        embeds: [createEmbed({
          title: "✅ User Banned",
          description: `Successfully banned **${user.tag}**.\n**Reason:** ${reason}`,
          color: '#ff4757',
          thumbnail: user.displayAvatarURL({ dynamic: true })
        })]
      });
    } catch (error) {
      return interaction.reply({
        embeds: [createEmbed({
          title: "Ban Failed",
          description: `Could not ban **${user.tag}**.\nError: \`${error.message}\``,
          color: '#ff4757'
        })],
        flags: 64
      });
    }
  }
};
