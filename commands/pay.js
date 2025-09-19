const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const USERS_FILE = "./users.json";

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function formatCoins(coins) {
    return coins.toLocaleString("en-US"); // 1,000 thay vì 1000
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pay")
        .setDescription("💸 Chuyển xu cho người khác")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("Người nhận xu")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("amount")
                .setDescription("Số xu muốn chuyển")
                .setRequired(true)
        ),

    async execute(interaction) {
        const senderId = interaction.user.id;
        const targetUser = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");

        // ===== Kiểm tra =====
        if (amount <= 0) {
            return interaction.reply({ content: "⚠️ Số xu phải lớn hơn 0!", ephemeral: true });
        }
        if (targetUser.id === senderId) {
            return interaction.reply({ content: "⚠️ Bạn không thể tự chuyển xu cho chính mình!", ephemeral: true });
        }
        if (targetUser.bot) {
            return interaction.reply({ content: "⚠️ Bạn không thể chuyển xu cho bot!", ephemeral: true });
        }

        // Kiểm tra thành viên có trong server không
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return interaction.reply({ content: "⚠️ Người nhận không có trong server này!", ephemeral: true });
        }

        // ===== Xử lý dữ liệu =====
        const users = loadUsers();

        if (!users[senderId]) users[senderId] = { coins: 1000, lastDaily: null };
        if (!users[targetUser.id]) users[targetUser.id] = { coins: 1000, lastDaily: null };

        if (users[senderId].coins < amount) {
            return interaction.reply({ content: "❌ Bạn không đủ xu để thực hiện giao dịch này!", ephemeral: true });
        }

        users[senderId].coins -= amount;
        users[targetUser.id].coins += amount;
        saveUsers(users);

        // ===== Gửi embed thông báo =====
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("💸 Giao dịch thành công!")
            .setDescription(
                `✅ **${interaction.user.username}** đã chuyển **${formatCoins(amount)} xu** cho **${targetUser.username}**!\n\n` +
                `💰 Số dư của bạn: **${formatCoins(users[senderId].coins)} xu**\n` +
                `💰 Số dư của ${targetUser.username}: **${formatCoins(users[targetUser.id].coins)} xu**`
            );

        return interaction.reply({ embeds: [embed] });
    },
};
