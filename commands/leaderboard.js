const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const USERS_FILE = "./users.json";

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("🏆 Xem bảng xếp hạng tổng hợp (Level + XP + Coins)"),

    async execute(interaction) {
        const users = loadUsers();
        const userEntries = Object.entries(users);

        if (userEntries.length === 0) {
            return interaction.reply({
                content: "❌ Hiện chưa có ai trong bảng xếp hạng.",
                ephemeral: true
            });
        }

        // 🔹 Sắp xếp theo Level > XP > Coins
        const sorted = userEntries.sort(([, a], [, b]) => {
            if (b.level !== a.level) return b.level - a.level;
            if (b.xp !== a.xp) return b.xp - a.xp;
            return b.coins - a.coins;
        });

        // 🔹 Lấy Top 10
        const top = sorted.slice(0, 10);

        let desc = top.map(([id, data], index) => {
            return `**#${index + 1}** <@${id}> — 🏅 Level **${data.level}** | ⭐ XP: ${data.xp} | 💰 Coins: ${data.coins}`;
        }).join("\n");

        const embed = new EmbedBuilder()
            .setTitle("🏆 Bảng Xếp Hạng Tổng Hợp")
            .setColor("Gold")
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setDescription(desc)
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    }
};
