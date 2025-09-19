const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const filePath = path.join(__dirname, "birthdays.json");

// 📝 Đọc file birthdays.json
function loadBirthdays() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2), "utf-8");
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (err) {
        console.error("❌ Lỗi đọc birthdays.json:", err);
        return {};
    }
}

// 💾 Ghi file birthdays.json
function saveBirthdays(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ➕ Thêm ngày sinh (định dạng: DD-MM-YYYY)
function addBirthday(userId, date) {
    const data = loadBirthdays();
    data[userId] = { date }; // lưu thành object để mở rộng sau này
    saveBirthdays(data);
}

// 🗑️ Xóa ngày sinh
function removeBirthday(userId) {
    const data = loadBirthdays();
    delete data[userId];
    saveBirthdays(data);
}

// 🎉 Kiểm tra và chúc mừng
async function checkBirthdays(client, channelId) {
    const today = new Date();
    const todayStr = today.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

    const data = loadBirthdays();
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    for (const [userId, info] of Object.entries(data)) {
        if (!info?.date) continue;

        // so sánh ngày-tháng, bỏ qua năm
        const birthdayStr = info.date.slice(0, 5); // lấy DD-MM
        if (birthdayStr === todayStr.replace("/", "-")) {
            const embed = new EmbedBuilder()
                .setTitle("🎂 Sinh Nhật Vui Vẻ! 🎉")
                .setDescription(`Chúc mừng sinh nhật <@${userId}> 🥳🎈🎁\n📅 Ngày sinh: **${info.date}**`)
                .setColor(0xFFC0CB) // hồng pastel
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }
    }
}

module.exports = {
    addBirthday,
    removeBirthday,
    checkBirthdays
};
