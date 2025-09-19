const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("🧹 Xóa hàng loạt tin nhắn trong kênh")
        .addIntegerOption(option =>
            option.setName("số_lượng")
                .setDescription("Số tin nhắn muốn xóa (1-100)")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) // chỉ mod/admin mới dùng
        .setDMPermission(false),

    async execute(interaction) {
        const amount = interaction.options.getInteger("số_lượng");

        if (amount < 1 || amount > 100) {
            return interaction.reply({
                content: "❌ Bạn chỉ có thể xóa từ **1 đến 100** tin nhắn!",
                ephemeral: true
            });
        }

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({
                content: `✅ Đã xóa **${deleted.size}** tin nhắn.`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: "⚠️ Không thể xóa tin nhắn. Có thể tin nhắn đã quá 14 ngày!",
                ephemeral: true
            });
        }
    }
};
