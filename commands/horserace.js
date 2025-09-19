const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionType
} = require("discord.js");
const fs = require("fs");

const USERS_FILE = "./users.json";

// ===== Helper: Safe file read/write =====
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE));
    } catch (e) {
        console.error("⚠️ Lỗi đọc users.json:", e);
        return {};
    }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getCoins(userId) {
    const users = loadUsers();
    if (!users[userId]) users[userId] = { coins: 1000, wins: 0, losses: 0, earnings: 0 };
    saveUsers(users);
    return users[userId].coins;
}

function updateCoins(userId, amount) {
    const users = loadUsers();
    if (!users[userId]) users[userId] = { coins: 1000, wins: 0, losses: 0, earnings: 0 };
    users[userId].coins += amount;
    if (users[userId].coins < 0) users[userId].coins = 0;
    saveUsers(users);
}

// ===== Odds =====
const HORSE_ODDS = {
    1: 2, // Ngựa 1 trả x2
    2: 3, // Ngựa 2 trả x3
    3: 4, // Ngựa 3 trả x4
    4: 6  // Ngựa 4 trả x6
};

// ===== Game State (multi-room) =====
const raceRooms = new Map(); // Map<channelId, {raceInProgress, bets, timer, message}>

module.exports = {
    data: new SlashCommandBuilder()
        .setName("horserace")
        .setDescription("🏇 Đua ngựa (multiplayer)"),
    async execute(interaction) {
        const channelId = interaction.channel.id;

        // Nếu phòng đã có đua đang chạy thì từ chối
        if (raceRooms.has(channelId) && raceRooms.get(channelId).raceInProgress) {
            return interaction.reply("⚠️ Cuộc đua ở phòng này đang diễn ra, vui lòng chờ!");
        }

        // Khởi tạo state mới cho phòng
        raceRooms.set(channelId, {
            raceInProgress: true,
            bets: {},
            timer: null,
            message: null
        });

        const room = raceRooms.get(channelId);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("horse1").setLabel("Ngựa 1").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("horse2").setLabel("Ngựa 2").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("horse3").setLabel("Ngựa 3").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("horse4").setLabel("Ngựa 4").setStyle(ButtonStyle.Primary)
        );

        let timeLeft = 30;
        const embed = new EmbedBuilder()
            .setTitle("🏇 Đua ngựa bắt đầu!")
            .setColor("Purple")
            .setDescription(
                `Chọn ngựa bạn muốn đặt cược bằng nút bên dưới.\nBạn có **${timeLeft} giây** để tham gia!\n\n` +
                `📊 Tỉ lệ trả thưởng:\n` +
                `🐎1 → x2\n🐎2 → x3\n🐎3 → x4\n🐎4 → x6\n\n` +
                `🌱 Người tham gia cược\n*Chưa có ai*`
            );

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        room.message = msg;

        // Collector button
        const collector = msg.createMessageComponentCollector({ time: 30000 });

        collector.on("collect", async i => {
            const userId = i.user.id;
            if (room.bets[userId]) {
                return i.reply({ content: "⚠️ Bạn đã đặt cược rồi!", ephemeral: true });
            }

            const horse = parseInt(i.customId.replace("horse", ""));

            // Gửi modal nhập số xu
            const modal = new ModalBuilder()
                .setCustomId(`betmodal_${horse}_${channelId}`)
                .setTitle(`🐎 Ngựa ${horse} - Nhập số xu cược`);

            const betInput = new TextInputBuilder()
                .setCustomId("betamount")
                .setLabel("Nhập số xu bạn muốn cược")
                .setPlaceholder("Ví dụ: 200")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(betInput));
            await i.showModal(modal);
        });

        // Xử lý modal submit
        const modalHandler = async modalInteraction => {
            if (modalInteraction.type !== InteractionType.ModalSubmit) return;
            if (!modalInteraction.customId.startsWith("betmodal_")) return;

            const parts = modalInteraction.customId.split("_");
            const horse = parseInt(parts[1]);
            const modalChannelId = parts[2];
            if (modalChannelId !== channelId) return; // đảm bảo đúng phòng

            const userId = modalInteraction.user.id;
            if (room.bets[userId]) {
                return modalInteraction.reply({ content: "⚠️ Bạn đã đặt cược rồi!", ephemeral: true });
            }

            const betStr = modalInteraction.fields.getTextInputValue("betamount");
            const bet = parseInt(betStr);

            if (isNaN(bet) || bet <= 0) {
                return modalInteraction.reply({ content: "⚠️ Số xu cược phải > 0!", ephemeral: true });
            }

            const balance = getCoins(userId);
            if (balance < bet) {
                return modalInteraction.reply({ content: `⚠️ Bạn không đủ xu! (cần ${bet}, có ${balance})`, ephemeral: true });
            }

            updateCoins(userId, -bet);
            room.bets[userId] = { horse, bet };

            // Cập nhật danh sách người chơi
            const betLines = Object.entries(room.bets)
                .map(([uid, { horse, bet }]) => `• <@${uid}> cược **${bet}** xu cho 🐎${horse} (x${HORSE_ODDS[horse]})`)
                .join("\n");

            const newEmbed = EmbedBuilder.from(embed).setDescription(
                `Chọn ngựa bạn muốn đặt cược bằng nút bên dưới.\nBạn có **${timeLeft} giây** để tham gia!\n\n📊 Tỉ lệ trả thưởng:\n🐎1 → x2\n🐎2 → x3\n🐎3 → x4\n🐎4 → x6\n\n🌱 Người tham gia cược\n${betLines}`
            );
            await msg.edit({ embeds: [newEmbed], components: [row] });

            await modalInteraction.reply({ content: `✅ Bạn đã cược **${bet}** xu cho 🐎${horse}! (x${HORSE_ODDS[horse]})`, ephemeral: true });
        };

        interaction.client.on("interactionCreate", modalHandler);

        // Đếm ngược
        room.timer = setInterval(async () => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(room.timer);
                return;
            }

            const betLines = Object.entries(room.bets).length > 0
                ? Object.entries(room.bets)
                    .map(([uid, { horse, bet }]) => `• <@${uid}> cược **${bet}** xu cho 🐎${horse} (x${HORSE_ODDS[horse]})`)
                    .join("\n")
                : "*Chưa có ai*";

            const newEmbed = EmbedBuilder.from(embed).setDescription(
                `Chọn ngựa bạn muốn đặt cược bằng nút bên dưới.\nBạn có **${timeLeft} giây** để tham gia!\n\n📊 Tỉ lệ trả thưởng:\n🐎1 → x2\n🐎2 → x3\n🐎3 → x4\n🐎4 → x6\n\n🌱 Người tham gia cược\n${betLines}`
            );
            await msg.edit({ embeds: [newEmbed], components: [row] }).catch(() => {});
        }, 1000);

        // Khi hết 30s
        collector.on("end", async () => {
            clearInterval(room.timer);
            interaction.client.removeListener("interactionCreate", modalHandler);

            // 🔴 Ẩn toàn bộ nút chọn ngựa
            await msg.edit({ components: [] }).catch(() => {});

            if (Object.keys(room.bets).length === 0) {
                raceRooms.delete(channelId);
                return interaction.followUp("❌ Không có ai tham gia, huỷ cuộc đua.");
            }

            await startRace(interaction, room);
        });
    }
};

// ===== Race Logic =====
async function startRace(interaction, room) {
    const trackLength = 20;
    let positions = [0, 0, 0, 0];
    let skipTurn = [false, false, false, false];
    const channelId = interaction.channel.id;

    const raceEmbed = new EmbedBuilder()
        .setTitle("🏇 Đua Ngựa")
        .setColor("Blue")
        .setDescription("Bắt đầu cuộc đua...");

    const raceMsg = room.message;
    await raceMsg.edit({ embeds: [raceEmbed] });

    function renderRace(eventMessage = null) {
        const horseIcons = ["🐎", "🏇", "🐴", "🐎💨"];
        let lines = positions.map((pos, i) => {
            const icon = horseIcons[Math.floor(Math.random() * horseIcons.length)];
            const track = "─".repeat(Math.max(0, pos)) + icon + "─".repeat(Math.max(0, trackLength - pos));
            return `${i + 1}️⃣ | ${track}🏁`;
        });
        if (eventMessage) lines.push(`\n${eventMessage}`);
        return lines.join("\n");
    }

    let winner = null;
    const raceInterval = setInterval(async () => {
        if (winner) return;

        let eventMessage = null;

        for (let i = 0; i < positions.length; i++) {
            if (skipTurn[i]) {
                skipTurn[i] = false;
                continue;
            }

            positions[i] += Math.random() < 0.5 ? 1 : 0;

            if (Math.random() < 0.2) {
                const roll = Math.random();
                if (roll < 0.5) {
                    positions[i] += 2;
                    eventMessage = `⚡ Ngựa ${i + 1} tăng tốc, nhảy vọt 2 bước!`;
                } else if (roll < 0.85) {
                    skipTurn[i] = true;
                    eventMessage = `💤 Ngựa ${i + 1} hụt hơi, nghỉ 1 lượt!`;
                } else {
                    positions[i] = Math.max(0, positions[i] - 1);
                    eventMessage = `😵 Ngựa ${i + 1} trượt chân, lùi lại 1 bước!`;
                }
            }
        }

        let winners = [];
        for (let i = 0; i < positions.length; i++) {
            if (positions[i] >= trackLength) winners.push(i + 1);
        }

        if (winners.length > 0) {
            winner = winners[Math.floor(Math.random() * winners.length)];
            clearInterval(raceInterval);

            setTimeout(async () => {
                const users = loadUsers();
                let resultLines = [];

                for (let [uid, { horse, bet }] of Object.entries(room.bets)) {
                    if (!users[uid]) users[uid] = { coins: 1000, wins: 0, losses: 0, earnings: 0 };

                    let text = "";
                    if (horse === winner) {
                        const reward = bet * HORSE_ODDS[horse];
                        users[uid].coins += reward;   // cộng trực tiếp
                        users[uid].wins++;
                        users[uid].earnings += reward;

                        text = `✅ <@${uid}> chọn **🐎${horse}** → Thắng! Nhận **${reward}** xu (x${HORSE_ODDS[horse]})`;
                    } else {
                        users[uid].losses++;
                        text = `❌ <@${uid}> chọn **🐎${horse}** → Thua mất **${bet}** xu`;
                    }

                    const finalBalance = users[uid].coins;
                    text += ` (Số dư: ${finalBalance}💰)`;
                    resultLines.push(text);
                }

                saveUsers(users); // chỉ lưu 1 lần cuối

                raceEmbed
                    .setTitle("🏆 Kết Quả Cuộc Đua")
                    .setColor("Green")
                    .setDescription(renderRace())
                    .setFields(
                        { name: "🐴 Ngựa thắng", value: `Ngựa số **${winner}** (x${HORSE_ODDS[winner]})` },
                        { name: "📦 Kết quả cược", value: resultLines.join("\n") }
                    );

                await raceMsg.edit({
                    embeds: [raceEmbed],
                    components: []
                });

                raceRooms.delete(channelId);
            }, 1500);
        } else {
            raceEmbed
                .setTitle("🏇 Đua Ngựa Đang Diễn Ra...")
                .setColor("Blue")
                .setFields([])
                .setDescription(renderRace(eventMessage));
            await raceMsg.edit({ embeds: [raceEmbed] }).catch(() => {});
        }
    }, 1500);
}
