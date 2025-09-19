const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// ====================== ĐỌC FILE LỆNH ======================
const commands = [];
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

const names = new Map();
const duplicates = [];

for (const file of commandFiles) {
    const command = require(path.join(__dirname, "commands", file));

    if (command.data) {
        const name = command.data.name;

        // Kiểm tra trùng tên lệnh
        if (names.has(name)) {
            duplicates.push({
                name,
                oldFile: names.get(name),
                newFile: file
            });

            // Xoá lệnh cũ trước khi thêm lệnh mới
            const index = commands.findIndex(cmd => cmd.name === name);
            if (index !== -1) commands.splice(index, 1);
        }

        names.set(name, file);
        commands.push(command.data.toJSON());
    } else {
        console.warn(`❌ File ${file} không có "command.data"`);
    }
}

// ====================== REPORT ======================
console.log("\n================= BÁO CÁO LỆNH =================");
console.log("Tổng số file lệnh đọc được:", commandFiles.length);
console.log("Tổng số lệnh hợp lệ (sau khi xử lý):", commands.length);

if (duplicates.length > 0) {
    console.log("\n⚠️  PHÁT HIỆN LỆNH TRÙNG:");
    duplicates.forEach(d => {
        console.log(`   - "${d.name}": ${d.oldFile} ❌ bị ghi đè bởi ✅ ${d.newFile}`);
    });
} else {
    console.log("\n🎉 Không có lệnh trùng!");
}

console.log("\n✅ DANH SÁCH LỆNH HỢP LỆ:");
commands.forEach(cmd => console.log("   -", cmd.name));
console.log("=================================================\n");

// ====================== DEBUG ENV ======================
console.log("🔑 Debug ENV:");
console.log("   TOKEN      =", process.env.TOKEN ? "✅ Loaded" : "❌ NOT FOUND");
console.log("   CLIENT_ID  =", process.env.CLIENT_ID || "❌ NOT FOUND");
console.log("   GUILD_ID   =", process.env.GUILD_ID || "❌ NOT FOUND");
// ======================================================

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        // CHỈ deploy vào GUILD
        console.log("⏳ Deploy GUILD slash commands...");
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log("🏠 Slash commands đã được deploy vào GUILD (update ngay)!");
    } catch (error) {
        console.error("❌ Lỗi khi deploy:", error);
        console.error("📡 API Error chi tiết:", error.rawError || error);
    }
})();
