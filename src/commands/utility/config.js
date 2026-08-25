const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../database/db');
const { createEmbed } = require('../../utils/embedBuilder');

module.exports = {
  module: 'utility',
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure Golem server settings')
    .addSubcommand(sub =>
      sub.setName("commands").setDescription("Sets the commands channel to block messages."))
    .addChannelOption(opt => opt.setName("channel").setDescription("Where to set the commands channel"))
    .addBooleanOption(opt => opt.setName("add/remove").setDescription("To set the channel (true), or to set it to nothing. (false)"))
    .addSubcommand(sub =>
      sub.setName('module')
        .setDescription('Enable or disable Golem bot modules')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('The module name')
            .setRequired(true)
            .addChoices(
              { name: 'Moderation', value: 'moderation' },
              { name: 'Automod', value: 'automod' },
              { name: 'Logging', value: 'logging' },
              { name: 'Welcome System', value: 'welcome' },
              { name: 'Ticketing', value: 'tickets' },
              { name: 'Suggestions', value: 'suggestions' },
              { name: 'Giveaways', value: 'giveaways' },
              { name: 'Leveling', value: 'leveling' },
              { name: 'Starboard', value: 'starboard' },
              { name: 'Minecraft Integration', value: 'minecraft' }
            )
        )
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Toggle state').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('welcome')
        .setDescription('Configure Welcome Messages')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable welcome messages').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Where welcome embeds are sent').addChannelTypes(ChannelType.GuildText))
        .addStringOption(opt => opt.setName('message').setDescription('Message support variables: {user}, {username}, {server}, {membercount}'))
    )
    .addSubcommand(sub =>
      sub.setName('goodbye')
        .setDescription('Configure Goodbye Messages')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable goodbye messages').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Where goodbye embeds are sent').addChannelTypes(ChannelType.GuildText))
        .addStringOption(opt => opt.setName('message').setDescription('Message support variables: {user}, {username}, {server}, {membercount}'))
    )
    .addSubcommand(sub =>
      sub.setName('logging')
        .setDescription('Configure Server Logging channel')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable server logging').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText))
    )
    .addSubcommand(sub =>
      sub.setName('starboard')
        .setDescription('Configure Starboard channel')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable starboard').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Starboard channel').addChannelTypes(ChannelType.GuildText))
        .addIntegerOption(opt => opt.setName('threshold').setDescription('Required stars to pin (default: 3)').setMinValue(1))
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Display current server config status')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const settings = db.getGuildSettings(guildId);

    if (subcommand === 'status') {
      let enabledModules = [];
      try { enabledModules = JSON.parse(settings.enabled_modules || '[]'); } catch (e) { }

      const embed = createEmbed({
        title: `${interaction.guild.name} Settings`,
        description: "Configure options using `/config [subcommand]`.",
        fields: [
          { name: "Enabled Modules", value: enabledModules.length > 0 ? `\`${enabledModules.join(', ')}\`` : "None", inline: false },
          { name: "Welcome System", value: settings.welcome_enabled === 1 ? `Channel: <#${settings.welcome_channel}>\nMessage: \`${settings.welcome_message}\`` : "❌ Disabled", inline: false },
          { name: "Goodbye System", value: settings.goodbye_enabled === 1 ? `Channel: <#${settings.goodbye_channel}>\nMessage: \`${settings.goodbye_message}\`` : "❌ Disabled", inline: false },
          { name: "Logging System", value: settings.logging_enabled === 1 ? `Channel: <#${settings.logging_channel}>` : "❌ Disabled", inline: true },
          { name: "Starboard", value: settings.starboard_enabled === 1 ? `Channel: <#${settings.starboard_channel}> | Stars: ${settings.starboard_threshold}` : "❌ Disabled", inline: true }
        ],
        color: '#1e1f29'
      });
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === "commands") {
      const enabled = interaction.opt.options.getBoolean("add/remove")
      const channel = interaction.opt.options.getChannel("channel")

      if (enabled == true || enabled == undefined) {
        if (channel) {
          const before = db.getGuildSettings(channel.id).commandOnlyChannels
          db.updateGuildSettings(interaction.guildId, 'commandOnlyChannels ', before.append(channel.id))
        } else {
          const before = db.getGuildSettings(interaction.guildId)
          db.updateGuildSettings(interaction.guildId, 'commandOnlyChannels ', before.append(interaction.channel.id))
        }
      } else {
        if (channel) {
          db.updateGuildSettings(interaction.guildId, 'commandOnlyChannels', before.splice(0, 1, channel.id))
        } else {
          db.updateGuildSettings(interaction.guildId, 'commandOnlyChannels', before.splice(0, 1, interaction.channel.id))
        }
      }
    }

    if (subcommand === 'module') {
      const name = interaction.options.getString('name');
      const enabled = interaction.options.getBoolean('enabled');

      let enabledModules = [];
      try { enabledModules = JSON.parse(settings.enabled_modules || '[]'); } catch (e) { }

      if (enabled) {
        if (!enabledModules.includes(name)) enabledModules.push(name);
      } else {
        enabledModules = enabledModules.filter(m => m !== name);
      }

      db.updateGuildSettings(guildId, 'enabled_modules', JSON.stringify(enabledModules));

      return interaction.reply({
        content: `Module **${name}** has been **${enabled ? 'ENABLED' : 'DISABLED'}**.`
      });
    }

    if (subcommand === 'welcome') {
      const enabled = interaction.options.getBoolean('enabled');
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');

      db.updateGuildSettings(guildId, 'welcome_enabled', enabled ? 1 : 0);
      if (channel) db.updateGuildSettings(guildId, 'welcome_channel', channel.id);
      if (message) db.updateGuildSettings(guildId, 'welcome_message', message);

      return interaction.reply({ content: "Welcome system configurations saved successfully." });
    }

    if (subcommand === 'goodbye') {
      const enabled = interaction.options.getBoolean('enabled');
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');

      db.updateGuildSettings(guildId, 'goodbye_enabled', enabled ? 1 : 0);
      if (channel) db.updateGuildSettings(guildId, 'goodbye_channel', channel.id);
      if (message) db.updateGuildSettings(guildId, 'goodbye_message', message);

      return interaction.reply({ content: "Goodbye system configurations saved successfully." });
    }

    if (subcommand === 'logging') {
      const enabled = interaction.options.getBoolean('enabled');
      const channel = interaction.options.getChannel('channel');

      db.updateGuildSettings(guildId, 'logging_enabled', enabled ? 1 : 0);
      if (channel) db.updateGuildSettings(guildId, 'logging_channel', channel.id);

      return interaction.reply({ content: "Logging system configurations saved successfully." });
    }

    if (subcommand === 'starboard') {
      const enabled = interaction.options.getBoolean('enabled');
      const channel = interaction.options.getChannel('channel');
      const threshold = interaction.options.getInteger('threshold');

      db.updateGuildSettings(guildId, 'starboard_enabled', enabled ? 1 : 0);
      if (channel) db.updateGuildSettings(guildId, 'starboard_channel', channel.id);
      if (threshold) db.updateGuildSettings(guildId, 'starboard_threshold', threshold);

      return interaction.reply({ content: "Starboard configurations saved successfully." });
    }
  }
};
