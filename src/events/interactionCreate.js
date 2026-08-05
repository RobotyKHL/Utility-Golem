const { Collection, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const logger = require('../utils/logger');
const { createEmbed } = require('../utils/embedBuilder');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      const guildId = interaction.guildId;
      
      // Module check
      if (guildId && command.module) {
        if (!db.isModuleEnabled(guildId, command.module)) {
          return interaction.reply({
            embeds: [createEmbed({
              title: "Module Disabled",
              description: `The **${command.module}** module is disabled on this server. An administrator can enable it via settings.`,
              color: '#ff4757'
            })],
            ephemeral: true
          });
        }
      }

      // Check Command Cooldowns
      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }
      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const defaultCooldownDuration = 3;
      const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1000);
          return interaction.reply({
            content: `Please wait, you are on a cooldown for \`/${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
            ephemeral: true
          });
        }
      }
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        await command.execute(interaction, client);
      } catch (error) {
        logger.error(`Error executing command ${command.data.name}: ${error.message}`);
        const errorEmbed = createEmbed({
          title: "Command Error",
          description: "An error occurred while executing this command. Please contact the administrator.",
          color: '#ff4757'
        });
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      }
    } else if (interaction.isButton() || interaction.isStringSelectMenu()) {
      // Pass button & select menu interactions to dynamic handlers in the modules
      const customId = interaction.customId;

      // Tickets handling
      if (customId.startsWith('ticket_')) {
        const ticketModule = require('../modules/tickets/ticketsHandler');
        return ticketModule.handleInteraction(interaction);
      }

      // Suggestions handling
      if (customId.startsWith('suggest_')) {
        const suggestionModule = require('../modules/suggestions/suggestionsHandler');
        return suggestionModule.handleInteraction(interaction);
      }

      // Roles handling (Verification & Self-assign roles)
      if (customId.startsWith('role_') || customId.startsWith('verify_')) {
        const roleModule = require('../modules/roles/rolesHandler');
        return roleModule.handleInteraction(interaction);
      }

      // Giveaways handling
      if (customId === 'giveaway_enter') {
        const giveawayManager = require('../modules/giveaways/giveawayManager');
        const result = giveawayManager.addParticipant(interaction.message.id, interaction.user.id);
        if (result === 'added') {
          return interaction.reply({ content: "You have entered the giveaway! 🎉", ephemeral: true });
        } else if (result === 'removed') {
          return interaction.reply({ content: "You have left the giveaway.", ephemeral: true });
        } else {
          return interaction.reply({ content: "This giveaway is no longer active.", ephemeral: true });
        }
      }
    }
  }
};
