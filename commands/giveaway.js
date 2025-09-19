const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, Events } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("🎉 Quản lý giveaway")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // chỉ mod/admin
        .addSubcommand(sub =>
            sub.setName("start")
                .setDescription("🎉 Tạo một giveaway mới")
                .addStringOption(option =>
                    option.setName("prize")
                        .setDescription("Phần thưởng của giveaway")
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName("duration")
                        .setDescription("Thời gian (tính bằng phút)")
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName("winners")
                        .setDescription("Số lượng người thắng (mặc định: 1)")
                        .setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName("reroll")
                .setDescription("🔄 Reroll giveaway để chọn người thắng mới")
                .addStringOption(option =>
                    option.setName("messageid")
                        .setDescription("ID của tin nhắn giveaway")
                        .setRequired(true))
        ),

    async execute(interaction, client) {
        if (interaction.options.getSubcommand() === "start") {
            const prize = interaction.options.getString("prize");
            const durationMinutes = interaction.options.getInteger("duration");
            const winnerCount = interaction.options.getInteger("winners") || 1;
            const durationMs = durationMinutes * 60 * 1000;
            const endTime = Date.now() + durationMs;

            const channel = interaction.channel;

            // Embed ban đầu
            const embed = new EmbedBuilder()
                .setTitle(`🎉 ${prize}`)
                .setDescription(
                    `Ends: <t:${Math.floor(endTime / 1000)}:R> (<t:${Math.floor(endTime / 1000)}:F>)\n` +
                    `Hosted by: ${interaction.user}\n` +
                    `Entries: 0\n` +
                    `Winners: ${winnerCount}`
                )
                .setColor("Gold")
                .setTimestamp();

            const msg = await channel.send({ embeds: [embed] });
            await msg.react("🎉");

            await interaction.reply({ content: `✅ Giveaway **${prize}** đã được tạo!`, ephemeral: true });

            // Cập nhật số người tham gia
            const updateEntries = async () => {
                try {
                    const reaction = msg.reactions.cache.get("🎉");
                    if (!reaction) return;
                    const users = await reaction.users.fetch();
                    const entries = users.filter(u => !u.bot).size;

                    const updatedEmbed = EmbedBuilder.from(embed).setDescription(
                        embed.data.description.replace(/Entries: \d+/i, `Entries: ${entries}`)
                    );

                    await msg.edit({ embeds: [updatedEmbed] });
                } catch (err) {
                    console.error("❌ Lỗi update Entries:", err);
                }
            };

            client.on(Events.MessageReactionAdd, async (reaction, user) => {
                if (reaction.message.id === msg.id && reaction.emoji.name === "🎉" && !user.bot) {
                    await updateEntries();
                }
            });

            client.on(Events.MessageReactionRemove, async (reaction, user) => {
                if (reaction.message.id === msg.id && reaction.emoji.name === "🎉" && !user.bot) {
                    await updateEntries();
                }
            });

            // Kết thúc sau duration
            setTimeout(async () => {
                try {
                    const reaction = msg.reactions.cache.get("🎉");
                    if (!reaction) return msg.reply("❌ Không có ai tham gia giveaway.");

                    const users = await reaction.users.fetch();
                    const participants = users.filter(u => !u.bot).map(u => u);

                    if (participants.length === 0) {
                        return msg.reply("❌ Không có ai tham gia giveaway.");
                    }

                    const winners = [];
                    const pool = [...participants];

                    for (let i = 0; i < winnerCount; i++) {
                        if (pool.length === 0) break;
                        const winner = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
                        if (winner) winners.push(`<@${winner.id}>`);
                    }

                    if (winners.length > 0) {
                        msg.reply(`🎊 Chúc mừng ${winners.join(", ")} đã thắng **${prize}**! 🎊`);
                    } else {
                        msg.reply("❌ Không có người thắng giveaway.");
                    }
                } catch (err) {
                    console.error("❌ Lỗi chọn winner:", err);
                }
            }, durationMs);
        }

        // =================== REROLL ===================
        if (interaction.options.getSubcommand() === "reroll") {
            const messageId = interaction.options.getString("messageid");

            try {
                const channel = interaction.channel;
                const msg = await channel.messages.fetch(messageId);

                if (!msg) return interaction.reply({ content: "❌ Không tìm thấy tin nhắn giveaway!", ephemeral: true });

                const reaction = msg.reactions.cache.get("🎉");
                if (!reaction) return interaction.reply({ content: "❌ Không có ai tham gia giveaway này!", ephemeral: true });

                const users = await reaction.users.fetch();
                const entries = users.filter(u => !u.bot);

                if (entries.size === 0) {
                    return interaction.reply({ content: "❌ Không có ai tham gia để reroll!", ephemeral: true });
                }

                const winners = entries.random(1);

                await msg.reply(
                    `🔄 Giveaway reroll!\n🎊 Người thắng mới: ${winners.map(w => `<@${w.id}>`).join(", ")} 🎊`
                );

                return interaction.reply({ content: "✅ Đã reroll thành công!", ephemeral: true });
            } catch (err) {
                console.error("❌ Lỗi reroll:", err);
                return interaction.reply({ content: "❌ Lỗi khi reroll giveaway!", ephemeral: true });
            }
        }
    },
};
