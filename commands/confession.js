const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events
} = require("discord.js");
const fs = require("fs");

const CONFESSION_CHANNEL_ID = "1417538178029584504";
const COUNTER_FILE = "./confessionCounter.json";

function getConfessionCount() {
    if (!fs.existsSync(COUNTER_FILE)) {
        fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count: 0 }, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(COUNTER_FILE, "utf8"));
    return data.count;
}

function increaseConfessionCount() {
    const data = JSON.parse(fs.readFileSync(COUNTER_FILE, "utf8"));
    data.count++;
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2));
    return data.count;
}

function registerConfessionEvents(client) {
    client.on(Events.InteractionCreate, async interaction => {
        if (interaction.isButton()) {
            if (["confess_public", "confess_private"].includes(interaction.customId)) {
                const modal = new ModalBuilder()
                    .setCustomId(`modal_${interaction.customId}`)
                    .setTitle("✍️ Nhập confession của bạn");

                const confessionInput = new TextInputBuilder()
                    .setCustomId("confession_input")
                    .setLabel("Nội dung confession")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(confessionInput));

                return interaction.showModal(modal);
            }
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_confess")) {
            const confessionText = interaction.fields.getTextInputValue("confession_input");
            const channel = await interaction.guild.channels.fetch(CONFESSION_CHANNEL_ID);

            let authorText = interaction.customId.includes("public")
                ? `👤 Người gửi: ${interaction.user.tag}`
                : "🙈 Người gửi: Ẩn danh";

            const embed = new EmbedBuilder()
                .setTitle("💌 Confession mới")
                .setDescription(confessionText)
                .addFields({ name: "Thông tin", value: authorText })
                .setColor("Random")
                .setTimestamp();

            const confessionNumber = increaseConfessionCount();

            if (channel.type === 0) {
                const msg = await channel.send({ embeds: [embed] });
                await msg.startThread({
                    name: `Confession #${confessionNumber}`,
                    autoArchiveDuration: 1440
                });
            } else if (channel.type === 15) {
                await channel.threads.create({
                    name: `Confession #${confessionNumber}`,
                    message: { embeds: [embed] }
                });
            } else {
                return interaction.reply({ content: "⚠️ Kênh confession không hợp lệ!", ephemeral: true });
            }

            await interaction.reply({ content: "✅ Confession của bạn đã được gửi!", ephemeral: true });
        }
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("confession-setup")
        .setDescription("Tạo hệ thống gửi confession"),
    async execute(interaction) {
        // ✅ Chỉ bạn mới được dùng
        if (interaction.user.id !== "1307649035385049172") {
            return interaction.reply({
                content: "❌ Bạn không có quyền dùng lệnh này!",
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle("📋 Hướng dẫn gửi confession")
            .setDescription(
                "Chọn 1 trong 2 nút dưới để gửi confession.\n\n" +
                "📌 **Gửi hiện tên** → Confession sẽ kèm tên bạn khi đăng.\n" +
                "📌 **Gửi ẩn danh** → Confession sẽ được ẩn danh."
            )
            .setColor("Blue");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("confess_public")
                .setLabel("Gửi hiện tên")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("confess_private")
                .setLabel("Gửi ẩn danh")
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
    registerConfessionEvents
};
