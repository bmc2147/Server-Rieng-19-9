const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const configPath = path.join(__dirname, "../serverConfig.json");

// ===== Load & Save Config =====
function loadConfig() {
    if (!fs.existsSync(configPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function saveConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("security")
        .setDescription("Quản lý AntiRaid & AntiSpam")
        .addSubcommand(sub =>
            sub.setName("antiraid")
                .setDescription("Bật/tắt chống raid")
                .addStringOption(option =>
                    option.setName("mode")
                        .setDescription("Chọn on/off")
                        .setRequired(true)
                        .addChoices(
                            { name: "on", value: "on" },
                            { name: "off", value: "off" }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName("antispam")
                .setDescription("Bật/tắt chống spam")
                .addStringOption(option =>
                    option.setName("mode")
                        .setDescription("Chọn on/off")
                        .setRequired(true)
                        .addChoices(
                            { name: "on", value: "on" },
                            { name: "off", value: "off" }
                        )
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const mode = interaction.options.getString("mode");

        const config = loadConfig();
        config[interaction.guild.id] = config[interaction.guild.id] || {};

        if (sub === "antiraid") {
            config[interaction.guild.id].antiraid = mode === "on";
        } else if (sub === "antispam") {
            config[interaction.guild.id].antispam = mode === "on";
        }

        saveConfig(config);

        await interaction.reply(
            `🔐 ${sub} đã được **${mode.toUpperCase()}** cho server này.`
        );
    }
};
