const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { createEmbed } = require('../../utils/embedBuilder');

module.exports = {
  module: 'moderation',
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk deletes messages in the current channel')
    .addIntegerOption(option => 
      option.setName('amount')
            .setDescription('Number of messages to clear (1-100)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    
    // Fetch and delete
    await interaction.channel.bulkDelete(amount, true).then(messages => {
      return interaction.reply({
        embeds: [createEmbed({
          description: `Successfully cleared **${messages.size}** messages.`,
          color: '#2ed573'
        })],
        flags: 64
      });
    }).catch(err => {
      return interaction.reply({ content: `Failed to delete messages: ${err.message}`, flags: 64 });
    });
  }
};
