const { Events } = require("discord.js");
const { addBirthday } = require("../helpers/birthdayManager");

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // ✅ Xử lý Modal nhập ngày sinh
        if (interaction.isModalSubmit()) {
            if (interaction.customId === "birthdayModal") {
                const date = interaction.fields.getTextInputValue("birthdayInput");

                // Kiểm tra định dạng dd-mm-yyyy
                if (!/^\d{2}-\d{2}-\d{4}$/.test(date)) {
                    return interaction.reply({
                        content: "❌ Sai định dạng! Hãy nhập **dd-mm-yyyy** (ví dụ: 16-09-2000).",
                        ephemeral: true
                    });
                }

                addBirthday(interaction.user.id, date);
                return interaction.reply({
                    content: `✅ Đã lưu sinh nhật của bạn: **${date}** 🎂`,
                    ephemeral: true
                });
            }
        }
    },
};
