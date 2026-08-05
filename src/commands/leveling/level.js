const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { createEmbed } = require('../../utils/embedBuilder');

module.exports = {
  module: 'leveling',
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Server leveling commands')
    .addSubcommand(sub =>
      sub.setName('rank')
         .setDescription('Display your current rank and level')
         .addUserOption(opt => opt.setName('user').setDescription('The user to view'))
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard')
         .setDescription('Show server leveling leaderboards')
    )
    .addSubcommand(sub =>
      sub.setName('reward-add')
         .setDescription('Add a role reward for a level')
         .addIntegerOption(opt => opt.setName('level').setDescription('Target level').setRequired(true).setMinValue(1))
         .addRoleOption(opt => opt.setName('role').setDescription('Role to reward').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('reward-remove')
         .setDescription('Remove a role reward for a level')
         .addIntegerOption(opt => opt.setName('level').setDescription('Target level').setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub =>
      sub.setName('reward-list')
         .setDescription('List all leveling role rewards')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === 'rank') {
      const user = interaction.options.getUser('user') || interaction.user;
      if (user.bot) {
        return interaction.reply({ content: "Bots do not gain XP or levels.", flags: 64 });
      }

      const userStats = db.getUserLevel(guildId, user.id);
      
      // Calculate progress percentage
      const nextLevelXp = (userStats.level * 100) + 100;
      const percentage = Math.min(100, Math.floor((userStats.xp / nextLevelXp) * 100));
      
      // Render text progress bar
      const barSize = 10;
      const filledCount = Math.round((percentage / 100) * barSize);
      const emptyCount = barSize - filledCount;
      const progressBar = '█'.repeat(filledCount) + '░'.repeat(emptyCount);

      // Find position on leaderboard
      const leaderboard = db.getLeaderboard(guildId);
      const rank = leaderboard.findIndex(entry => entry.user_id === user.id) + 1;

      return interaction.reply({
        embeds: [createEmbed({
          title: `${user.username}'s Rank Status`,
          description: `Here is the current leveling status for ${user}.`,
          fields: [
            { name: "Rank", value: `#${rank || 'N/A'}`, inline: true },
            { name: "Level", value: `${userStats.level}`, inline: true },
            { name: "XP", value: `${userStats.xp} / ${nextLevelXp}`, inline: true },
            { name: "Progress Bar", value: `\`[${progressBar}]\` ${percentage}%`, inline: false }
          ],
          thumbnail: user.displayAvatarURL({ dynamic: true }),
          color: '#3498db'
        })]
      });
    }

    if (subcommand === 'leaderboard') {
      const leaderboard = db.getLeaderboard(guildId).slice(0, 10);
      
      if (leaderboard.length === 0) {
        return interaction.reply({ content: "No user stats recorded yet." });
      }

      const rows = [];
      for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        rows.push(`**#${i + 1}** <@${entry.user_id}> - Level **${entry.level}** (${entry.xp} XP)`);
      }

      return interaction.reply({
        embeds: [createEmbed({
          title: `Server Leveling Leaderboard`,
          description: rows.join('\n'),
          color: '#1e1f29'
        })]
      });
    }

    // Role reward management (requires admin)
    if (subcommand === 'reward-add') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "You need Administrator permissions to configure rewards.", flags: 64 });
      }
      
      const level = interaction.options.getInteger('level');
      const role = interaction.options.getRole('role');

      db.saveLevelReward(guildId, level, role.id);
      
      return interaction.reply({ content: `Role ${role} will now be awarded upon reaching **Level ${level}**.` });
    }

    if (subcommand === 'reward-remove') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "You need Administrator permissions to configure rewards.", flags: 64 });
      }

      const level = interaction.options.getInteger('level');
      const deleted = db.deleteLevelReward(guildId, level);

      if (deleted) {
        return interaction.reply({ content: `Successfully removed role reward for **Level ${level}**.` });
      } else {
        return interaction.reply({ content: `No reward found for **Level ${level}**.` });
      }
    }

    if (subcommand === 'reward-list') {
      const rewards = db.getLevelRewards(guildId);
      const rewardKeys = Object.keys(rewards);

      if (rewardKeys.length === 0) {
        return interaction.reply({ content: "No level rewards configured yet." });
      }

      const desc = rewardKeys
        .sort((a, b) => Number(a) - Number(b))
        .map(level => `Level **${level}**: <@&${rewards[level]}>`)
        .join('\n');

      return interaction.reply({
        embeds: [createEmbed({
          title: "Level Role Rewards",
          description: desc,
          color: '#1e1f29'
        })]
      });
    }
  }
};
