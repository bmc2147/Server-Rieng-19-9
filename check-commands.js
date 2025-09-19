// check-commands.js
require("dotenv").config();
const { REST, Routes } = require("discord.js");

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("⏳ Đang lấy danh sách GLOBAL commands...");
        const globalCommands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
        console.log(`🌍 Global Commands: ${globalCommands.length}`);
        globalCommands.forEach(cmd => console.log("   -", cmd.name));

        console.log("\n⏳ Đang lấy danh sách GUILD commands...");
        const guildCommands = await rest.get(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID));
        console.log(`🏠 Guild Commands: ${guildCommands.length}`);
        guildCommands.forEach(cmd => console.log("   -", cmd.name));
    } catch (error) {
        console.error(error);
    }
})();
