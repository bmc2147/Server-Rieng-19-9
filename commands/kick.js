const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick một thành viên khỏi server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Người cần kick')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const member = interaction.options.getMember('target');
        if (!member) {
            return interaction.reply({ content: 'Không tìm thấy thành viên!', ephemeral: true });
        }

        try {
            await member.kick();
            await interaction.reply(`${member.user.tag} đã bị kick!`);
        } catch (err) {
            console.error(err);
            await interaction.reply('Không thể kick thành viên này.');
        }
    }
};
