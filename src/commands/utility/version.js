const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createEmbed } = require('../../utils/embedBuilder');
const pkg = require('../../../package.json');

function getConfigVersion() {
  try {
    const cfgPath = path.join(process.cwd(), 'config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      return cfg.bot && cfg.bot.version;
    }
  } catch (_) {}
  return undefined;
}

module.exports = {
  module: 'utility',
  data: new SlashCommandBuilder()
    .setName('version')
    .setDescription('Display the current Golem version and build info'),
  async execute(interaction) {
    const cfgVersion = getConfigVersion();
    const lastRestart = Date.now() - interaction.client.uptime;

    return interaction.reply({
      embeds: [createEmbed({
        title: "ℹ️ Golem Version",
        fields: [
          { name: "Bot Version", value: `\`${cfgVersion || pkg.version}\``, inline: true },
          { name: "Node.js", value: `\`${process.version}\``, inline: true },
          { name: "Library", value: "discord.js v14", inline: true },
          { name: "Last Restart", value: `<t:${Math.round(lastRestart / 1000)}:R>`, inline: true },
          { name: "Guilds", value: `${`${interaction.client.guilds.cache.size}`}`, inline: true }
        ],
        color: '#1e1f29'
      })]
    });
  }
};