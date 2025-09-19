const { Events } = require("discord.js");
const fs = require("fs");
const path = require("path");

const USERS_FILE = "./users.json";
const configPath = path.join(__dirname, "../serverConfig.json");

// Load/save
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function loadConfig() {
    if (!fs.existsSync(configPath)) return {};
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

// Công thức XP
function getXPForNextLevel(level) {
    return 100 + (level - 1) * 50;
}

// 🎯 Level → Role
const levelRoles = {
    5: "1415327873908211742",
    10: "1303335948691570709",
    20: "1415328534540324934",
    30: "1415329132245418147",
    40: "1415329110946873487",
    50: "1415340885100724244",
};

// AntiSpam
const userMessages = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const config = loadConfig();
        const serverConfig = config[message.guild.id];

        // 1️⃣ AntiSpam
        if (serverConfig?.antispam) {
            const userId = message.author.id;
            const now = Date.now();

            if (!userMessages.has(userId)) userMessages.set(userId, []);
            const timestamps = userMessages.get(userId);

            timestamps.push(now);
            const recent = timestamps.filter(t => now - t < 5000);
            userMessages.set(userId, recent);

            if (recent.length > 5) {
                try {
                    await message.member.timeout(60 * 1000, "AntiSpam: spam tin nhắn");
                    await message.channel.send(`⚠️ ${message.author} đã bị mute 1 phút do spam.`);
                    userMessages.set(userId, []);
                } catch (err) {
                    console.error("❌ Không mute được:", err);
                }
            }
        }

        // 2️⃣ Level system
        const userId = message.author.id;
        const users = loadUsers();
        if (!users[userId]) users[userId] = { coins: 1000, xp: 0, level: 1 };

        const user = users[userId];
        const xpGain = Math.floor(Math.random() * 10) + 5;
        user.xp += xpGain;

        const xpNeeded = getXPForNextLevel(user.level);
        if (user.xp >= xpNeeded) {
            user.level++;
            user.xp -= xpNeeded;

            const reward = user.level * 5000;
            user.coins += reward;

            await message.channel.send(
                `🎊 **${message.author.username}** đã lên level **${user.level}**!\n💰 Thưởng: **${reward.toLocaleString()}** coins`
            );

            if (levelRoles[user.level]) {
                const role = message.guild.roles.cache.get(levelRoles[user.level]);
                const member = await message.guild.members.fetch(userId);
                if (role && !member.roles.cache.has(role.id)) {
                    await member.roles.add(role);
                    await message.channel.send(`✅ ${message.author} đã nhận role **${role.name}**!`);
                }
            }
        }

        saveUsers(users);
    }
};
