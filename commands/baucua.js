const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
const fs = require("fs");

const USERS_FILE = "./users.json";

// ==================== HÀM QUẢN LÝ NGƯỜI DÙNG ====================
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ==================== CÁC CON VẬT ====================
const options = [
    { name: "Bầu", value: "bau", emoji: "🎃" },
    { name: "Cua", value: "cua", emoji: "🦀" },
    { name: "Cá", value: "ca", emoji: "🐟" },
    { name: "Nai", value: "nai", emoji: "🦌" },
    { name: "Tôm", value: "tom", emoji: "🦐" },
    { name: "Gà", value: "ga", emoji: "🐓" }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("baucua")
        .setDescription("🎲 Chơi Bầu Cua truyền thống VN"),

    async execute(interaction) {
        const userId = interaction.user.id;
        const users = loadUsers();

        // Tạo tài khoản mặc định nếu chưa có
        if (!users[userId]) {
            users[userId] = { coins: 1000, lastDaily: null };
            saveUsers(users);
        }

        // Embed chính
        const mainEmbed = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle("🎲 Bầu Cua 🎲")
            .setDescription(
                "👉 Chọn con vật bạn muốn cược bằng cách bấm nút bên dưới 🐓🦀🎃🐟🦌🦐\nSau đó nhập số tiền cược 💰"
            )
            .setFooter({ text: `Người chơi: ${interaction.user.username}` });

        // Hai hàng nút chọn con vật
        const row1 = new ActionRowBuilder().addComponents(
            ...options.slice(0, 3).map(opt =>
                new ButtonBuilder()
                    .setCustomId(`baucua_${opt.value}`)
                    .setLabel(opt.name)
                    .setEmoji(opt.emoji)
                    .setStyle(ButtonStyle.Primary)
            )
        );

        const row2 = new ActionRowBuilder().addComponents(
            ...options.slice(3, 6).map(opt =>
                new ButtonBuilder()
                    .setCustomId(`baucua_${opt.value}`)
                    .setLabel(opt.name)
                    .setEmoji(opt.emoji)
                    .setStyle(ButtonStyle.Primary)
            )
        );

        // Gửi message ban đầu
        const gameMessage = await interaction.reply({
            embeds: [mainEmbed],
            components: [row1, row2],
            fetchReply: true
        });

        // ==================== XỬ LÝ LƯỢT CHƠI ====================
        const filter = i => i.customId.startsWith("baucua_") && i.user.id === userId;
        const collector = gameMessage.createMessageComponentCollector({
            filter,
            time: 30000,
            max: 1
        });

        collector.on("collect", async i => {
            const choice = i.customId.replace("baucua_", "");
            const selectedOpt = options.find(o => o.value === choice);

            // Modal nhập tiền cược
            const modal = new ModalBuilder()
                .setCustomId(`betmodal_${choice}`)
                .setTitle("💰 Đặt cược");

            const betInput = new TextInputBuilder()
                .setCustomId("bet_amount")
                .setLabel("Nhập số coin bạn muốn cược")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Ví dụ: 100")
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(betInput));
            await i.showModal(modal);

            // Chờ modal submit
            const modalFilter = m => m.customId.startsWith("betmodal_") && m.user.id === userId;
            i.awaitModalSubmit({ filter: modalFilter, time: 30000 })
                .then(async modalSubmit => {
                    await modalSubmit.deferUpdate();

                    const bet = parseInt(modalSubmit.fields.getTextInputValue("bet_amount"));
                    if (isNaN(bet) || bet <= 0) {
                        return i.followUp({ content: "⚠️ Số coin cược không hợp lệ!", ephemeral: true });
                    }
                    if (users[userId].coins < bet) {
                        return i.followUp({ content: "❌ Bạn không đủ coin để cược!", ephemeral: true });
                    }

                    // Trừ tiền cược
                    users[userId].coins -= bet;

                    // 🎰 Hiệu ứng quay
                    let delay = 200;
                    for (let k = 0; k < 6; k++) {
                        const spinResult = Array.from({ length: 3 }, () =>
                            options[Math.floor(Math.random() * options.length)].emoji
                        );

                        mainEmbed.setDescription(
                            `🎰 Đang quay...\n${spinResult.join(" | ")}\n💰 Đang cược: ${bet} coin`
                        );

                        await gameMessage.edit({ embeds: [mainEmbed], components: [] });
                        await new Promise(r => setTimeout(r, delay));
                        delay += 150;
                    }

                    // 🎯 Kết quả cuối
                    const result = Array.from({ length: 3 }, () =>
                        options[Math.floor(Math.random() * options.length)]
                    );

                    const winCount = result.filter(r => r.value === choice).length;
                    let resultText = `🎯 Kết quả: ${result.map(r => r.emoji).join(" | ")}\n\n`;

                    if (winCount > 0) {
                        const win = bet * winCount;
                        users[userId].coins += bet + win;
                        resultText += `🎉 Con bạn chọn ${selectedOpt.emoji} xuất hiện **${winCount} lần**!\nBạn thắng **${win} coin**!\n💰 Số dư: **${users[userId].coins}**`;
                        mainEmbed.setColor("Green");
                    } else {
                        resultText += `😢 Không có con bạn chọn.\nBạn mất **${bet} coin**.\n💰 Số dư: **${users[userId].coins}**`;
                        mainEmbed.setColor("Red");
                    }

                    saveUsers(users);

                    // Hiển thị kết quả cuối cùng, không có nút chơi lại
                    mainEmbed.setDescription(resultText);
                    await gameMessage.edit({ embeds: [mainEmbed], components: [] });
                })
                .catch(() => {
                    i.followUp({ content: "⏰ Hết thời gian đặt cược!", ephemeral: true });
                });
        });
    }
};
