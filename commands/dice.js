const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCoins, updateCoins } = require("../economy"); // chú ý đường dẫn

const diceEmoji = ["🎲1", "🎲2", "🎲3", "🎲4", "🎲5", "🎲6"];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dice")
        .setDescription("🎲 Chơi Tài / Xỉu với xu")
        .addStringOption(opt =>
            opt.setName("bet_type")
                .setDescription("Chọn Tài hoặc Xỉu")
                .setRequired(true)
                .addChoices(
                    { name: "Tài (11–18)", value: "tai" },
                    { name: "Xỉu (3–10)", value: "xiu" }
                )
        )
        .addIntegerOption(opt =>
            opt.setName("bet")
                .setDescription("Số xu bạn muốn cược")
                .setRequired(true)
        ),
    async execute(interaction) {
        const choice = interaction.options.getString("bet_type");
        const bet = interaction.options.getInteger("bet");
        const userId = interaction.user.id;

        const balance = getCoins(userId);
        if (bet <= 0)
            return interaction.reply("⚠️ Số xu cược phải lớn hơn 0!");
        if (balance < bet)
            return interaction.reply(`⚠️ Bạn không đủ xu! Số dư hiện tại: **${balance}** 💰`);

        updateCoins(userId, -bet);

        let embed = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle("🎲 Dice - Tài / Xỉu")
            .setDescription(`🎲 Đang lắc xúc xắc...\n\n❔ ❔ ❔`);

        const reply = await interaction.reply({ embeds: [embed], fetchReply: true });

        let frame = 0;
        const interval = setInterval(async () => {
            frame++;
            const rand1 = Math.floor(Math.random() * 6);
            const rand2 = Math.floor(Math.random() * 6);
            const rand3 = Math.floor(Math.random() * 6);

            embed.setDescription(
                `🎲 Đang lắc xúc xắc...\n\n${diceEmoji[rand1]} ${diceEmoji[rand2]} ${diceEmoji[rand3]}`
            );
            await interaction.editReply({ embeds: [embed] });

            if (frame >= 5) {
                clearInterval(interval);

                const dice = [
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1
                ];
                const total = dice.reduce((a, b) => a + b, 0);

                let result, reward = 0;
                if ((choice === "tai" && total >= 11) || (choice === "xiu" && total <= 10)) {
                    reward = bet * 2;
                    updateCoins(userId, reward);
                    result = `🎉 Bạn chọn **${choice === "tai" ? "Tài" : "Xỉu"}** và thắng! Nhận **${reward}** xu ✅`;
                } else {
                    result = `💥 Bạn chọn **${choice === "tai" ? "Tài" : "Xỉu"}** nhưng thua mất **${bet}** xu ❌`;
                }

                const finalBalance = getCoins(userId);

                embed = new EmbedBuilder()
                    .setColor("Random")
                    .setTitle("🎲 Dice - Tài / Xỉu")
                    .setDescription(
                        `🎲 Kết quả: ${diceEmoji[dice[0]-1]} ${diceEmoji[dice[1]-1]} ${diceEmoji[dice[2]-1]}\n` +
                        `➡️ Tổng = **${total}**`
                    )
                    .addFields(
                        { name: "📦 Kết quả", value: result, inline: false },
                        { name: "💳 Số dư mới", value: `${finalBalance} xu`, inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });
            }
        }, 700);
    }
};
