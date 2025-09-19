const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Gỡ mute khỏi một thành viên')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Người cần unmute')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const member = interaction.options.getMember('target');
        if (!member) {
            return interaction.reply({ content: 'Không tìm thấy thành viên!', ephemeral: true });
        }

        const muteRole = interaction.guild.roles.cache.find(r => r.name === 'Muted');
        if (!muteRole) {
            return interaction.reply({ content: 'Không tìm thấy role Muted!', ephemeral: true });
        }

        try {
            await member.roles.remove(muteRole);
            await interaction.reply(`${member.user.tag} đã được unmute!`);
        } catch (err) {
            console.error(err);
            await interaction.reply('Không thể unmute thành viên này.');
        }
    }
};
