// horserace_top.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const USERS_FILE = "./users.json";

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE));
    } catch (err) {
        console.error("⚠️ Lỗi đọc users.json:", err);
        return {};
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("horserace_top")
        .setDescription("🏆 Xem bảng xếp hạng đua ngựa"),

    async execute(interaction) {
        const users = loadUsers();

        // Chuyển dữ liệu thành mảng và gán mặc định nếu thiếu
        const leaderboard = Object.entries(users)
            .map(([id, data]) => ({
                id,
                wins: data.wins || 0,
                losses: data.losses || 0,
                earnings: data.earnings || 0,
            }))
            // Sắp xếp: Earnings > Wins > Ít Losses
            .sort((a, b) => 
                b.earnings - a.earnings || 
                b.wins - a.wins || 
                a.losses - b.losses
            )
            .slice(0, 10); // Lấy top 10

        if (leaderboard.length === 0) {
            return interaction.reply({
                content: "⚠️ Chưa có ai tham gia đua ngựa.",
                ephemeral: true, // Chỉ người gõ lệnh thấy
            });
        }

        const desc = leaderboard
            .map((u, i) =>
                `**#${i + 1}** <@${u.id}> — 🐎 Thắng: **${u.wins}**, ` +
                `Thua: **${u.losses}**, ` +
                `Xu kiếm được: **${u.earnings.toLocaleString()}** 💰`
            )
            .join("\n");

        const embed = new EmbedBuilder()
            .setColor("Gold")
            .setTitle("🏆 Bảng Xếp Hạng Đua Ngựa")
            .setDescription(desc)
            .setFooter({ text: "Ai sẽ là tay đua huyền thoại?" })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
