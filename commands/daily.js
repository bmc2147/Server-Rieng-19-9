// commands/daily.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const USERS_FILE = "./users.json";

// ===== Helpers =====
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("🎁 Điểm danh hàng ngày để nhận xu ngẫu nhiên"),

    async execute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const users = loadUsers();
        const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

        // Nếu chưa có tài khoản, tạo mới với 1000 xu
        if (!users[userId]) {
            users[userId] = {
                coins: 1000,
                lastDaily: null,
                wins: 0,
                losses: 0,
                earnings: 0,
            };
        }

        // Kiểm tra xem hôm nay đã điểm danh chưa
        if (users[userId].lastDaily === today) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Yellow")
                        .setTitle("📅 Bạn đã điểm danh hôm nay rồi!")
                        .setDescription("Hãy quay lại vào **ngày mai** để nhận thưởng tiếp 🎁")
                        .setFooter({ text: "Điểm danh một lần mỗi ngày để nhận thưởng miễn phí." }),
                ],
                ephemeral: true,
            });
        }

        // Tính phần thưởng ngẫu nhiên
        const reward = Math.floor(Math.random() * 401) + 100; // 100 - 500 xu

        // Cập nhật dữ liệu
        users[userId].coins += reward;
        users[userId].lastDaily = today;
        saveUsers(users);

        // Embed kết quả
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("🎉 Điểm danh thành công!")
            .setDescription(`Xin chúc mừng **${username}**!`)
            .addFields(
                { name: "💰 Phần thưởng hôm nay", value: `+ **${reward} xu**`, inline: false },
                { name: "💳 Số dư hiện tại", value: `**${users[userId].coins} xu**`, inline: false },
            )
            .setFooter({ text: "Hãy quay lại mỗi ngày để nhận thưởng nhé!" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
