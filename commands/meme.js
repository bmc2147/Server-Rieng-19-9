const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

// Fix fetch: nếu Node >=18 thì có sẵn fetch, nếu không thì fallback node-fetch
const fetch = global.fetch || ((...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args)));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("meme")
        .setDescription("😂 Gửi 1 ảnh meme ngẫu nhiên từ Reddit"),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const response = await fetch("https://meme-api.com/gimme");
            const data = await response.json();

            const embed = new EmbedBuilder()
                .setTitle(data.title)
                .setImage(data.url)
                .setColor("Random")
                .setFooter({ text: `👍 ${data.ups} upvote | 📂 r/${data.subreddit}` });

            // Thêm nút "Xem trên Reddit"
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel("🔗 Xem trên Reddit")
                    .setStyle(ButtonStyle.Link)
                    .setURL(data.postLink)
            );

            await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error(error);
            await interaction.editReply("❌ Không lấy được meme, thử lại sau!");
        }
    },
};
