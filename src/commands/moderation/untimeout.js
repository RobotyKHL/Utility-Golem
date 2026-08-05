const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { createEmbed } = require('../../utils/embedBuilder');

module.exports = {
  module: 'moderation',
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Removes a member from timeout')
    .addUserOption(option => option.setName('user').setDescription('The user to untimeout').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) {
      return interaction.reply({ content: "That user is not in the server.", ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: "I cannot moderate this member.", ephemeral: true });
    }

    await member.timeout(null);

    // Save mod log
    db.addModLog(interaction.guild.id, user.id, interaction.user.id, 'UNTIMEOUT', 'Timeout removed');

    return interaction.reply({
      embeds: [createEmbed({
        title: "Timeout Removed",
        description: `Successfully removed timeout from **${user.tag}**.`,
        color: '#2ed573'
      })]
    });
  }
};
