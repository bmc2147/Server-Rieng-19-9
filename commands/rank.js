// commands/rank.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const USERS_FILE = "./users.json";

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function getXPForNextLevel(level) {
    return 100 + (level - 1) * 50;
}

function createProgressBar(current, max, length = 12) {
    const gradient = ["🟥", "🟧", "🟨", "🟩", "🟦", "🟪"];
    const filledLength = Math.max(0, Math.min(length, Math.round((current / max) * length)));
    let bar = "";

    for (let i = 0; i < length; i++) {
        if (i < filledLength) bar += gradient[i % gradient.length];
        else bar += "⬛";
    }

    const percent = Math.round((current / max) * 100);
    return `${bar} ${percent}%`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("📊 Xem cấp độ và tiến trình của bạn"),

    async execute(interaction) {
        const users = loadUsers();
        const userId = interaction.user.id;
        const username = interaction.user.username;

        if (!users[userId]) {
            return interaction.reply({
                content: "❌ Bạn chưa có dữ liệu, hãy chat vài lần để bắt đầu!",
                flags: 64
            });
        }

        const user = users[userId];
        const xpNeeded = getXPForNextLevel(user.level);
        const progressBar = createProgressBar(user.xp, xpNeeded);

        const embed = new EmbedBuilder()
            .setTitle(`📊 Rank của ${username}`)
            .setColor("Random")
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: "Level", value: `${user.level}`, inline: true },
                { name: "Coins", value: `${user.coins.toLocaleString()} 💰`, inline: true },
                { name: "XP", value: `${user.xp}/${xpNeeded}`, inline: true },
                { name: "Tiến trình", value: progressBar }
            );

        await interaction.reply({ embeds: [embed] });
    }
};
