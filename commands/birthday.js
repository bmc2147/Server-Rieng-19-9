const { SlashCommandBuilder } = require("discord.js");
const { addBirthday, removeBirthday } = require("../helpers/birthdayManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("birthday")
        .setDescription("Quản lý sinh nhật")
        .addSubcommand(cmd =>
            cmd.setName("add")
                .setDescription("Thêm ngày sinh của bạn")
                .addStringOption(opt =>
                    opt.setName("date")
                        .setDescription("Ngày sinh (dd-mm-yyyy)")
                        .setRequired(true)
                )
        )
        .addSubcommand(cmd =>
            cmd.setName("remove")
                .setDescription("Xóa ngày sinh của bạn")
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === "add") {
            const date = interaction.options.getString("date");

            if (!/^\d{2}-\d{2}-\d{4}$/.test(date)) {
                return interaction.reply({
                    content: "❌ Sai định dạng! Hãy dùng **dd-mm-yyyy** (ví dụ: 21-04-2003).",
                    flags: 64
                });
            }

            addBirthday(interaction.user.id, date);
            return interaction.reply(`✅ Đã lưu sinh nhật của bạn: **${date}** 🎂`);
        }

        if (sub === "remove") {
            removeBirthday(interaction.user.id);
            return interaction.reply("🗑️ Đã xóa sinh nhật của bạn.");
        }
    }
};
