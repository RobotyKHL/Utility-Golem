const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { createEmbed } = require('../../utils/embedBuilder');

module.exports = {
  module: 'moderation',
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlocks the current text channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    const channel = interaction.channel;

    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null
      });

      return interaction.reply({
        embeds: [createEmbed({
          title: "Channel Unlocked",
          description: `This channel has been unlocked.`,
          color: '#2ed573'
        })]
      });
    } catch (err) {
      return interaction.reply({ content: `Failed to unlock channel: ${err.message}`, ephemeral: true });
    }
  }
};
