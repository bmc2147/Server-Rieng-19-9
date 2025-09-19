const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("📷 Xem avatar của một người hoặc của chính bạn")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("Chọn người cần xem avatar")
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser("user") || interaction.user;

        const embed = new EmbedBuilder()
            .setTitle(`🖼 Avatar của ${user.username}`)
            .setImage(user.displayAvatarURL({ size: 1024, dynamic: true }))
            .setColor("Random");

        await interaction.reply({ embeds: [embed] });
    }
};
