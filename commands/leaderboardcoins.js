const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const USERS_FILE = "./users.json";

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboardcoins")
        .setDescription("💰 Xem bảng xếp hạng theo Coins"),

    async execute(interaction) {
        const users = loadUsers();
        const userEntries = Object.entries(users);

        if (userEntries.length === 0) {
            return interaction.reply({
                content: "❌ Hiện chưa có ai trong bảng xếp hạng Coins.",
                ephemeral: true
            });
        }

        // 🔹 Sắp xếp theo Coins
        const sorted = userEntries.sort(([, a], [, b]) => b.coins - a.coins);

        // 🔹 Lấy Top 10
        const top = sorted.slice(0, 10);

        let desc = top.map(([id, data], index) => {
            return `**#${index + 1}** <@${id}> — 💰 Coins: **${data.coins}** | 🏅 Level: ${data.level} | ⭐ XP: ${data.xp}`;
        }).join("\n");

        const embed = new EmbedBuilder()
            .setTitle("💰 Bảng Xếp Hạng Coins")
            .setColor("Green")
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setDescription(desc)
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    }
};
