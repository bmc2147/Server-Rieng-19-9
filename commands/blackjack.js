
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const fs = require("fs");

// ===== Hệ thống coin =====
const USERS_FILE = "./users.json";

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getCoins(userId) {
    const users = loadUsers();
    if (!users[userId]) users[userId] = { coins: 1000 }; // mặc định 1000 xu
    saveUsers(users);
    return users[userId].coins;
}

function updateCoins(userId, amount) {
    const users = loadUsers();
    if (!users[userId]) users[userId] = { coins: 1000 };
    users[userId].coins += amount;
    if (users[userId].coins < 0) users[userId].coins = 0;
    saveUsers(users);
}

// ===== Game Blackjack =====

// Bảng Unicode cho 52 lá bài
const playingCards = {
    "A♠": "🂡", "2♠": "🂢", "3♠": "🂣", "4♠": "🂤", "5♠": "🂥", "6♠": "🂦", "7♠": "🂧", "8♠": "🂨", "9♠": "🂩", "10♠": "🂪", "J♠": "🂫", "Q♠": "🂭", "K♠": "🂮",
    "A♥": "🂱", "2♥": "🂲", "3♥": "🂳", "4♥": "🂴", "5♥": "🂵", "6♥": "🂶", "7♥": "🂷", "8♥": "🂸", "9♥": "🂹", "10♥": "🂺", "J♥": "🂻", "Q♥": "🂽", "K♥": "🂾",
    "A♦": "🃁", "2♦": "🃂", "3♦": "🃃", "4♦": "🃄", "5♦": "🃅", "6♦": "🃆", "7♦": "🃇", "8♦": "🃈", "9♦": "🃉", "10♦": "🃊", "J♦": "🃋", "Q♦": "🃍", "K♦": "🃎",
    "A♣": "🃑", "2♣": "🃒", "3♣": "🃓", "4♣": "🃔", "5♣": "🃕", "6♣": "🃖", "7♣": "🃗", "8♣": "🃘", "9♣": "🃙", "10♣": "🃚", "J♣": "🃛", "Q♣": "🃝", "K♣": "🃞",
};

const suits = ["♠", "♥", "♦", "♣"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function drawCard() {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const value = values[Math.floor(Math.random() * values.length)];
    return { suit, value };
}

function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        if (["J", "Q", "K"].includes(card.value)) {
            value += 10;
        } else if (card.value === "A") {
            value += 11;
            aces++;
        } else {
            value += parseInt(card.value);
        }
    }

    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }
    return value;
}

// 👉 Format lá bài bằng Unicode Playing Cards
function formatHand(hand) {
    return hand.map((c) => playingCards[`${c.value}${c.suit}`] || `${c.value}${c.suit}`).join(" ");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blackjack")
        .setDescription("🎰 Chơi Blackjack đặt cược xu!")
        .addIntegerOption((option) =>
            option
                .setName("bet")
                .setDescription("Số xu bạn muốn cược")
                .setRequired(true)
        ),

    async execute(interaction) {
        const bet = interaction.options.getInteger("bet");
        const userId = interaction.user.id;
        const balance = getCoins(userId);

        if (bet <= 0)
            return interaction.reply({ content: "⚠️ Số xu cược phải lớn hơn 0!" });
        if (balance < bet)
            return interaction.reply({
                content: `⚠️ Bạn không đủ xu! Số dư hiện tại: **${balance}** 💰`,
            });

        updateCoins(userId, -bet); // trừ tiền cược

        let playerHand = [drawCard(), drawCard()];
        let dealerHand = [drawCard(), drawCard()];

        let gameOver = false;

        const getEmbed = (showDealer = false, result = null) => {
            const playerValue = calculateHandValue(playerHand);
            const dealerValue = calculateHandValue(dealerHand);

            const embed = new EmbedBuilder()
                .setColor("DarkButNotBlack")
                .setTitle("🎴 Blackjack 🎴")
                .addFields(
                    {
                        name: "👤 Bạn",
                        value: `${formatHand(playerHand)}\n(Điểm: **${playerValue}**)`,
                        inline: false,
                    },
                    {
                        name: "🤖 Dealer",
                        value: showDealer
                            ? `${formatHand(dealerHand)}\n(Điểm: **${dealerValue}**)`
                            : `${formatHand([dealerHand[0]])} 🂠`, // 🂠 = lá úp
                        inline: false,
                    }
                )
                .setFooter({
                    text: `💰 Cược: ${bet} | Số dư: ${getCoins(userId)}`,
                });

            if (result) embed.setDescription(result);
            return embed;
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("hit")
                .setLabel("🎴 Rút bài")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("stand")
                .setLabel("🛑 Dừng")
                .setStyle(ButtonStyle.Secondary),
        );

        await interaction.reply({
            embeds: [getEmbed(false)],
            components: [row],
        });
        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            time: 60000,
        });

        collector.on("collect", async (i) => {
            if (i.user.id !== userId)
                return i.reply({
                    content: "⚠️ Đây không phải game của bạn!",
                    flags: 64,
                });

            if (gameOver) return;

            if (i.customId === "hit") {
                playerHand.push(drawCard());
                const playerValue = calculateHandValue(playerHand);

                if (playerValue > 21) {
                    gameOver = true;
                    collector.stop();
                    return i.update({
                        embeds: [
                            getEmbed(true, `💥 Bạn **thua**! Mất ${bet} xu ❌`),
                        ],
                        components: [],
                    });
                }
                return i.update({ embeds: [getEmbed(false)], components: [row] });
            }

            if (i.customId === "stand") {
                const playerValue = calculateHandValue(playerHand);
                let dealerValue = calculateHandValue(dealerHand);

                while (dealerValue < 17) {
                    dealerHand.push(drawCard());
                    dealerValue = calculateHandValue(dealerHand);
                }

                gameOver = true;
                collector.stop();

                let result;
                if (dealerValue > 21 || playerValue > dealerValue) {
                    updateCoins(userId, bet * 2);
                    result = `🎉 Bạn **thắng**! Nhận ${bet * 2} xu ✅`;
                } else if (playerValue === dealerValue) {
                    updateCoins(userId, bet);
                    result = `🤝 Hòa! Nhận lại ${bet} xu 🔄`;
                } else {
                    result = `💥 Bạn **thua**! Mất ${bet} xu ❌`;
                }

                return i.update({
                    embeds: [getEmbed(true, result)],
                    components: [],
                });
            }
        });

        collector.on("end", async () => {
            if (!gameOver) {
                gameOver = true;
                await message.edit({
                    embeds: [
                        getEmbed(true, `⏰ Hết thời gian! Bạn đã thua và mất ${bet} xu ❌`),
                    ],
                    components: [],
                });
            }
        });
    },
};
