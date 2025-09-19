const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("📊 Xem thông tin server hiện tại"),
    async execute(interaction) {
        const { guild } = interaction;

        if (!guild) {
            return interaction.reply({
                content: "❌ Lệnh này chỉ dùng trong server!",
                ephemeral: true
            });
        }

        const owner = await guild.fetchOwner();

        const embed = new EmbedBuilder()
            .setTitle(`📌 Thông tin Server: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: "👑 Chủ server", value: `${owner.user.tag}`, inline: true },
                { name: "🆔 ID", value: `${guild.id}`, inline: true },
                { name: "👥 Thành viên", value: `${guild.memberCount}`, inline: true },
                { name: "📅 Ngày tạo", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
                { name: "📌 Số kênh", value: `${guild.channels.cache.size}`, inline: true },
                { name: "📌 Số role", value: `${guild.roles.cache.size}`, inline: true }
            )
            .setColor("Blue")
            .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
