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
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(user.id);

    if (member && !member.bannable) {
      return interaction.reply({ content: "I cannot ban this user (they might have a higher role).", ephemeral: true });
    }

    await interaction.guild.members.ban(user, { reason: `${interaction.user.tag}: ${reason}` });
    
    // Log is handled by guildBanAdd event

    return interaction.reply({
      embeds: [createEmbed({
        title: "User Banned",
        description: `Successfully banned **${user.tag}**.\n**Reason:** ${reason}`,
        color: '#ff4757'
      })]
    });
  }
};
