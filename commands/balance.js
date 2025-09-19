// commands/balance.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const USERS_FILE = "./users.json";

// ===== Helpers =====
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE));
    } catch (err) {
        console.error("⚠️ Lỗi đọc users.json:", err);
        return {};
    }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ===== Command =====
module.exports = {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("💰 Xem số dư xu và thống kê của bạn"),

    async execute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;

        const users = loadUsers();

        // Nếu chưa có tài khoản, tạo mặc định
        if (!users[userId]) {
            users[userId] = {
                coins: 1000,
                wins: 0,
                losses: 0,
                earnings: 0,
                lastDaily: null
            };
            saveUsers(users);
        }

        const userData = users[userId];

        // Tạo embed hiển thị
        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`💰 Số dư của ${username}`)
            .addFields(
                { name: "💵 Xu hiện tại", value: `**${userData.coins}** xu`, inline: true },
                { name: "🏆 Thắng", value: `**${userData.wins}** lần`, inline: true },
                { name: "💥 Thua", value: `**${userData.losses}** lần`, inline: true },
                { name: "📈 Tổng thu nhập", value: `**${userData.earnings}** xu`, inline: false }
            )
            .setFooter({ text: "Hãy tiếp tục chơi để nâng cao thành tích của bạn!" })
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            ephemeral: true // 🔒 Chỉ mình người chơi thấy
        });
    },
};
