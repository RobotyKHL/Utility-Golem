const db = require('../../database/db');

async function handleInteraction(interaction) {
  const { customId, member, guild } = interaction;
  
  // 1. Verification Role
  if (customId === 'verify_join') {
    await interaction.deferReply({ ephemeral: true });

    // Look for a role named "Verified"
    let role = guild.roles.cache.find(r => r.name.toLowerCase() === 'verified');
    if (!role) {
      // Create role if possible
      try {
        role = await guild.roles.create({
          name: 'Verified',
          reason: 'Golem verification system role creation'
        });
      } catch (err) {
        return interaction.editReply({ content: "Verification role does not exist and bot was unable to create it. Please check permissions." });
      }
    }

    if (member.roles.cache.has(role.id)) {
      return interaction.editReply({ content: "You are already verified!" });
    }

    try {
      await member.roles.add(role);
      return interaction.editReply({ content: "Successfully verified! You now have access to the server." });
    } catch (err) {
      return interaction.editReply({ content: `Failed to assign verification role: ${err.message}` });
    }
  }

  // 2. Button Role (Toggles)
  if (customId.startsWith('role_add_')) {
    await interaction.deferReply({ ephemeral: true });
    const roleId = customId.split('role_add_')[1];
    const role = guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.editReply({ content: "This role is no longer available." });
    }

    try {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return interaction.editReply({ content: `Removed the **${role.name}** role from you.` });
      } else {
        await member.roles.add(role);
        return interaction.editReply({ content: `Added the **${role.name}** role to you.` });
      }
    } catch (err) {
      return interaction.editReply({ content: `Failed to update roles: ${err.message}` });
    }
  }

  // 3. Select Menu Role
  if (customId === 'role_select') {
    await interaction.deferReply({ ephemeral: true });
    const selectedValues = interaction.values; // Array of role IDs chosen
    
    // We can parse all options from the select menu itself to see what roles they could have selected
    // and add/remove accordingly.
    const menuOptions = interaction.component.options.map(opt => opt.value);

    try {
      for (const roleId of menuOptions) {
        const hasRole = member.roles.cache.has(roleId);
        const shouldHave = selectedValues.includes(roleId);
        
        if (hasRole && !shouldHave) {
          const role = guild.roles.cache.get(roleId);
          if (role) await member.roles.remove(role).catch(() => {});
        } else if (!hasRole && shouldHave) {
          const role = guild.roles.cache.get(roleId);
          if (role) await member.roles.add(role).catch(() => {});
        }
      }
      return interaction.editReply({ content: "Your server roles have been updated!" });
    } catch (err) {
      return interaction.editReply({ content: `Failed to update select roles: ${err.message}` });
    }
  }
}

module.exports = { handleInteraction };
