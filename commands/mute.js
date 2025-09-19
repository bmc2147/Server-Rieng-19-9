const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute một thành viên bằng role')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Người cần mute')
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
            await member.roles.add(muteRole);
            await interaction.reply(`${member.user.tag} đã bị mute!`);
        } catch (err) {
            console.error(err);
            await interaction.reply('Không thể mute thành viên này.');
        }
    }
};