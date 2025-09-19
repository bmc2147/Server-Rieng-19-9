const { Events } = require("discord.js");

// Danh sách từ cấm
const badWords = ["đm", "địt", "lồn", "cặc", "fuck", "shit"];

// Regex phát hiện link
const linkRegex = /(https?:\/\/[^\s]+)/gi;

// Map lưu spam + vi phạm
const userMessageMap = new Map();
const userViolationMap = new Map(); // lưu số lần vi phạm

// Danh sách ID được miễn trừ (ví dụ: chủ server, admin)
const exemptUsers = ["1307649035385049172"];

// Hàm xoá tin nhắn an toàn (tránh Unknown Message 10008)
async function safeDelete(message) {
    try {
        if (message.deletable) {
            await message.delete();
        }
    } catch (err) {
        if (err.code === 10008) {
        } else {
            console.error("❌ Lỗi khi xóa tin nhắn:", err);
        }
    }
}

function registerAutoMod(client) {
    client.on(Events.MessageCreate, async (message) => {
        if (!message.guild || message.author.bot) return;

        // Nếu user nằm trong danh sách miễn trừ → bỏ qua
        if (exemptUsers.includes(message.author.id)) return;

        let violated = false; // đánh dấu có vi phạm
        let isLinkViolation = false; // riêng cho link

        // 🚫 1. Lọc từ cấm
        if (badWords.some(word => message.content.toLowerCase().includes(word))) {
            violated = true;
            await safeDelete(message);
            await warnUser(message, "❌ Không được chửi bậy!");
        }

        // 🚫 2. Lọc link lạ (1 lần = timeout luôn)
        if (linkRegex.test(message.content)) {
            if (!message.content.includes("youtube.com") && !message.content.includes("discord.gg")) {
                violated = true;
                isLinkViolation = true;
                await safeDelete(message);
                await warnUser(message, "❌ Không được gửi link lạ!");
            }
        }

        // 🚫 3. Chống spam (5 tin / 7 giây)
        const now = Date.now();
        const userData = userMessageMap.get(message.author.id) || { count: 0, lastMessage: now };

        if (now - userData.lastMessage < 7000) {
            userData.count++;
        } else {
            userData.count = 1;
        }
        userData.lastMessage = now;
        userMessageMap.set(message.author.id, userData);

        if (userData.count >= 5) {
            violated = true;
            await safeDelete(message);
            await warnUser(message, "❌ Bạn đang spam quá nhanh!");
        }

        // 🚫 Nếu vi phạm
        if (violated) {
            // Nếu là link lạ → timeout luôn
            if (isLinkViolation) {
                return applyTimeout(message, "Gửi link lạ");
            }

            // Còn lại (chửi bậy + spam) → cảnh báo 3 lần
            const current = (userViolationMap.get(message.author.id) || 0) + 1;
            userViolationMap.set(message.author.id, current);

            if (current >= 3) {
                await applyTimeout(message, "Vi phạm nhiều lần (chửi bậy/spam)");
                userViolationMap.set(message.author.id, 0); // reset
            }
        }
    });
}

// Gửi cảnh báo tự xoá sau 5 giây
async function warnUser(message, warning) {
    return message.channel.send(`${warning} (${message.author})`).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
    });
}

// Timeout 60 phút
async function applyTimeout(message, reason) {
    try {
        const member = await message.guild.members.fetch(message.author.id);

        // ❗ Check bot có thể timeout user này không
        if (!member.moderatable) {
            await message.channel.send(`⚠️ Bot không thể timeout ${message.author} (role cao hơn bot hoặc thiếu quyền).`);
            return;
        }

        await member.timeout(60 * 60 * 1000, reason);
        await message.channel.send(`🚫 ${message.author} đã bị **timeout 60 phút** vì: ${reason}`);
    } catch (err) {
        console.error("❌ Không timeout được user:", err);
    }
}

module.exports = { registerAutoMod };
