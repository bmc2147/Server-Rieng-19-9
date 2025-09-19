const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Gửi bảng Ticket hỗ trợ")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: "❌ Lệnh này chỉ dùng trong server!", ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle("🎫 Trung tâm hỗ trợ")
            .setDescription("Chọn loại ticket bạn muốn tạo bên dưới 👇")
            .setColor("Blue");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("ticket_support")
                .setLabel("📘 Support")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("ticket_report")
                .setLabel("📕 Report")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("ticket_donate")
                .setLabel("💰 Donate")
                .setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });

        await interaction.reply({ content: "✅ Bảng ticket đã được gửi!", ephemeral: true });
    },
};
