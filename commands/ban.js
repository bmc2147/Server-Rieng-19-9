
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("🚫 Ban một người dùng")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers) // chỉ admin/mod
        .addUserOption(option =>
            option.setName("target")
                .setDescription("Người dùng cần ban")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("Lý do ban")
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser("target");
        const reason = interaction.options.getString("reason") || "Không có lý do";
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: "❌ Không tìm thấy thành viên trong server!", flags: 64 });
        }

        if (member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: "❌ Bạn không thể ban Admin/Mod!", flags: 64 });
        }

        try {
            // Ban user
            await member.ban({ reason });

            // Embed thông báo
            const embed = new EmbedBuilder()
                .setTitle("🚫 Thành viên bị ban")
                .setDescription(`**Người dùng:** ${target.tag} (${target.id})\n**Người ban:** ${interaction.user.tag}\n**Lý do:** ${reason}`)
                .setColor("Red")
                .setTimestamp();

            // Nút Unban
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`unban_${target.id}`)
                    .setLabel("Unban")
                    .setStyle(ButtonStyle.Success)
            );

            // Gửi công khai
            await interaction.reply({ embeds: [embed], components: [row] });

        } catch (err) {
            console.error(err);
            return interaction.reply({ content: `❌ Không thể ban: ${err.message}`, flags: 64 });
        }
    }
};