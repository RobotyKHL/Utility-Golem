const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { createEmbed } = require('../../utils/embedBuilder');

module.exports = {
  module: 'moderation',
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a member from the server')
    .addUserOption(opt => opt.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for ban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    // Use inGuild() — works even when guild object isn't cached
    if (!interaction.inGuild()) {
      return interaction.reply({ content: 'This command can only be used inside a server.', flags: 64 });
    }

    // Fetch guild if not cached
    const guild = interaction.guild ?? await interaction.client.guilds.fetch(interaction.guildId).catch(() => null);
    if (!guild) {
      return interaction.reply({ content: 'Could not load server data. Please try again.', flags: 64 });
    }

    const user   = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (user.id === interaction.user.id)        return interaction.reply({ content: 'You cannot ban yourself.', flags: 64 });
    if (user.id === interaction.client.user.id) return interaction.reply({ content: 'I cannot ban myself.', flags: 64 });

    const member = await guild.members.fetch(user.id).catch(() => null);

    if (member) {
      if (!member.bannable) {
        return interaction.reply({ content: 'I cannot ban this user — my role may be too low.', flags: 64 });
      }
      const execMember = await guild.members.fetch(interaction.user.id).catch(() => null);
      if (execMember && member.roles.highest.position >= execMember.roles.highest.position) {
        return interaction.reply({ content: 'You cannot ban someone with an equal or higher role.', flags: 64 });
      }
    }

    try {
      await guild.members.ban(user, { reason: `${interaction.user.tag}: ${reason}` });
      db.addModLog(guild.id, user.id, interaction.user.id, 'BAN', reason);

      return interaction.reply({
        embeds: [createEmbed({
          title: '🔨 User Banned',
          description: `Successfully banned **${user.tag}**\n**Reason:** ${reason}`,
          color: '#ff4757',
          thumbnail: user.displayAvatarURL({ dynamic: true })
        })]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Ban Failed', description: `\`${err.message}\``, color: '#ff4757' })],
        flags: 64
      });
    }
  }
};
