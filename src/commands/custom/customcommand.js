const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { createEmbed } = require('../../utils/embedBuilder');

module.exports = {
  module: 'utility',
  data: new SlashCommandBuilder()
    .setName('customcommand')
    .setDescription('Manage custom server commands')
    .addSubcommand(sub =>
      sub.setName('create')
         .setDescription('Create a new custom command')
         .addStringOption(opt => opt.setName('name').setDescription('Command triggers (e.g. "ip")').setRequired(true))
         .addStringOption(opt => opt.setName('response').setDescription('What the command responds with').setRequired(true))
         .addBooleanOption(opt => opt.setName('embed').setDescription('Respond with an embed instead of plain text'))
    )
    .addSubcommand(sub =>
      sub.setName('delete')
         .setDescription('Deletes a custom command')
         .addStringOption(opt => opt.setName('name').setDescription('Command trigger name').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
         .setDescription('Lists all custom commands on this server')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === 'create') {
      const name = interaction.options.getString('name').toLowerCase();
      const response = interaction.options.getString('response');
      const isEmbed = interaction.options.getBoolean('embed') ? 1 : 0;

      // Prevent overwriting built-in commands
      if (interaction.client.commands.has(name)) {
        return interaction.reply({ content: `\`/${name}\` is a built-in command and cannot be overwritten.`, ephemeral: true });
      }

      db.saveCustomCommand(guildId, name, response, isEmbed);

      const settings = db.getGuildSettings(guildId);
      const prefix = settings.prefix || 'g!';

      return interaction.reply({
        embeds: [createEmbed({
          title: "Custom Command Created",
          description: `Command \`${prefix}${name}\` has been created.`,
          fields: [
            { name: "Response Type", value: isEmbed === 1 ? "Embed" : "Plain Text", inline: true },
            { name: "Response Content", value: response, inline: false }
          ],
          color: '#2ed573'
        })]
      });
    }

    if (subcommand === 'delete') {
      const name = interaction.options.getString('name').toLowerCase();
      const deleted = db.deleteCustomCommand(guildId, name);

      if (deleted) {
        return interaction.reply({ content: `Successfully deleted custom command \`${name}\`.` });
      } else {
        return interaction.reply({ content: `Custom command \`${name}\` not found on this server.`, ephemeral: true });
      }
    }

    if (subcommand === 'list') {
      const cmds = db.getCustomCommands(guildId);
      const cmdNames = Object.keys(cmds);

      if (cmdNames.length === 0) {
        return interaction.reply({ content: "No custom commands configured for this server yet." });
      }

      const settings = db.getGuildSettings(guildId);
      const prefix = settings.prefix || 'g!';

      return interaction.reply({
        embeds: [createEmbed({
          title: "Custom Commands List",
          description: cmdNames.map(name => `• **${prefix}${name}** - ${cmds[name].is_embed === 1 ? '*[Embed]*' : '*[Text]*'}`).join('\n'),
          color: '#1e1f29'
        })]
      });
    }
  }
};
