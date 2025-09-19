// clear-global.js
require("dotenv").config();
const { REST, Routes } = require("discord.js");

// Kiểm tra biến môi trường
console.log("TOKEN:", process.env.TOKEN ? "✅ Loaded" : "❌ Missing");
console.log("CLIENT_ID:", process.env.CLIENT_ID || "❌ Missing");

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("⏳ Đang xóa toàn bộ GLOBAL commands...");
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }
        );
        console.log("🗑️ Đã xóa sạch GLOBAL commands!");
        console.log("Kết quả Discord trả về:", data);
    } catch (error) {
        console.error("❌ Lỗi khi xóa GLOBAL commands:", error);
    }
})();
