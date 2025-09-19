// commands/addcoins.js
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
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
        .setName("addcoins")
        .setDescription("💰 Admin: Thêm xu cho người dùng")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("Người dùng cần cộng xu")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("amount")
                .setDescription("Số xu cần thêm")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Chỉ admin có quyền

    async execute(interaction) {
        const targetUser = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");

        // Kiểm tra số xu hợp lệ
        if (amount <= 0) {
            return interaction.reply({
                content: "⚠️ Số xu phải lớn hơn 0!",
                ephemeral: true
            });
        }

        const users = loadUsers();

        // Nếu chưa có tài khoản, khởi tạo
        if (!users[targetUser.id]) {
            users[targetUser.id] = {
                coins: 1000, // mặc định 1000 xu khi mới tham gia
                wins: 0,
                losses: 0,
                earnings: 0
            };
        }

        // Cộng xu
        users[targetUser.id].coins += amount;

        saveUsers(users);

        // Gửi thông báo
        await interaction.reply({
            content: `✅ Đã cộng **${amount} xu** cho **${targetUser.username}**!\n💰 Số dư mới: **${users[targetUser.id].coins} xu**`,
            ephemeral: false // hiện công khai để minh bạch
        });
    },
};