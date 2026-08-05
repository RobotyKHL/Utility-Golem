const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { createEmbed } = require('../../utils/embedBuilder');

module.exports = {
  module: 'moderation',
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Puts a member in timeout')
    .addUserOption(option => option.setName('user').setDescription('The user to timeout').setRequired(true))
    .addIntegerOption(option => option.setName('duration').setDescription('Timeout duration in minutes').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for timeout'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) {
      return interaction.reply({ content: "That user is not in the server.", ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: "I cannot moderate this member.", ephemeral: true });
    }

    await member.timeout(duration * 60 * 1000, reason);

    // Save mod log
    db.addModLog(interaction.guild.id, user.id, interaction.user.id, 'TIMEOUT', `Duration: ${duration}m | Reason: ${reason}`);

    return interaction.reply({
      embeds: [createEmbed({
        title: "Timeout Applied",
        description: `Successfully timed out **${user.tag}** for **${duration} minutes**.\n**Reason:** ${reason}`,
        color: '#ff4757'
      })]
    });
  }
};
