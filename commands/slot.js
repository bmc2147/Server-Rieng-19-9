// commands/slot.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const USERS_FILE = "./users.json";

// ======= Helpers =======
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

function getCoins(userId) {
    const users = loadUsers();
    if (!users[userId]) {
        users[userId] = { coins: 1000, wins: 0, losses: 0, earnings: 0 };
        saveUsers(users);
    }
    return users[userId].coins;
}

function updateCoins(userId, amount) {
    const users = loadUsers();
    if (!users[userId]) {
        users[userId] = { coins: 1000, wins: 0, losses: 0, earnings: 0 };
    }
    users[userId].coins += amount;
    if (users[userId].coins < 0) users[userId].coins = 0;

    users[userId].earnings += amount;
    saveUsers(users);
}

// ======= Slash Command =======
module.exports = {
    data: new SlashCommandBuilder()
        .setName("slot")
        .setDescription("🎰 Quay Slot Machine đặt cược xu!")
        .addIntegerOption(opt =>
            opt.setName("bet")
                .setDescription("Số xu bạn muốn cược")
                .setRequired(true)
        ),

    async execute(interaction) {
        const bet = interaction.options.getInteger("bet");
        const userId = interaction.user.id;
        const balance = getCoins(userId);

        if (bet <= 0) {
            return interaction.reply({
                content: "⚠️ Số xu cược phải lớn hơn 0!",
                flags: 64
            });
        }
        if (balance < bet) {
            return interaction.reply({
                content: `⚠️ Bạn không đủ xu! Số dư hiện tại: **${balance}** 💰`,
                flags: 64
            });
        }

        // Trừ xu trước khi quay
        updateCoins(userId, -bet);

        const slots = ["🍒", "🍋", "🍇", "⭐", "💎"];
        const finalSpin = [
            slots[Math.floor(Math.random() * slots.length)],
            slots[Math.floor(Math.random() * slots.length)],
            slots[Math.floor(Math.random() * slots.length)],
        ];

        let embed = new EmbedBuilder()
            .setColor("Random")
            .setTitle("🎰 Slot Machine")
            .setDescription("| ❓ | ❓ | ❓ |")
            .addFields({ name: "💰 Tiền cược", value: `${bet} xu`, inline: true });

        await interaction.reply({ embeds: [embed] });

        // Hiệu ứng quay
        for (let i = 0; i < 10; i++) {
            const spin = [
                slots[Math.floor(Math.random() * slots.length)],
                slots[Math.floor(Math.random() * slots.length)],
                slots[Math.floor(Math.random() * slots.length)],
            ];
            embed.setDescription(`| ${spin[0]} | ${spin[1]} | ${spin[2]} |`);
            await interaction.editReply({ embeds: [embed] });
            await new Promise(r => setTimeout(r, 300));
        }

        // Tính kết quả
        embed.setDescription(`| ${finalSpin[0]} | ${finalSpin[1]} | ${finalSpin[2]} |`);

        let result;
        let reward = 0;

        if (finalSpin[0] === finalSpin[1] && finalSpin[1] === finalSpin[2]) {
            reward = bet * 5;
            result = `🎉 **Jackpot!** Ba biểu tượng giống nhau! Bạn thắng **${reward}** xu ✅`;
        } else if (
            finalSpin[0] === finalSpin[1] ||
            finalSpin[1] === finalSpin[2] ||
            finalSpin[0] === finalSpin[2]
        ) {
            reward = bet * 2;
            result = `✨ Hai biểu tượng giống nhau! Bạn thắng **${reward}** xu ✅`;
        } else {
            result = `💥 Không trúng gì! Bạn thua mất **${bet}** xu ❌`;
        }

        if (reward > 0) updateCoins(userId, reward);
        const finalBalance = getCoins(userId);

        embed.addFields(
            { name: "📦 Kết quả", value: result, inline: false },
            { name: "💳 Số dư mới", value: `${finalBalance} xu`, inline: true }
        );

        await interaction.editReply({ embeds: [embed] });
    }
};
