const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require("discord.js");
const ytdl = require("@distube/ytdl-core");
const ytSearch = require("yt-search");
const scdl = require("soundcloud-downloader").default;
const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));
const { getPreview } = require("spotify-url-info")(fetch);
const { 
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior
} = require("@discordjs/voice");

const queue = new Map();

// ========== Utils ==========
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function progressBar(current, total, size = 20) {
    if (!total || total <= 0) return "▱".repeat(size);
    const filled = Math.min(size, Math.round((current / total) * size));
    return "▰".repeat(filled) + "▱".repeat(size - filled);
}

function buildNowPlayingEmbed(song, current = 0) {
    const bar = progressBar(current, song.duration);
    return new EmbedBuilder()
        .setTitle("🎶 Đang phát")
        .setDescription(
            `[${song.title}](${song.url})\n\n${bar}\n\`${formatTime(current)} / ${formatTime(song.duration)}\`\n👤 Người order: **${song.requester}**`
        )
        .setThumbnail(song.thumbnail || null)
        .setColor("Purple")
        .setFooter({ text: `CuongBilliards Music Bot` });
}

function buildMusicButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("pause").setLabel("⏸️ Pause").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("resume").setLabel("▶️ Resume").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("skip").setLabel("⏭️ Skip").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("queue").setLabel("📑 Queue").setStyle(ButtonStyle.Primary),
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("stop").setLabel("⏹️ Stop").setStyle(ButtonStyle.Danger),
    );

    return [row1, row2];
}

async function updateProgressBar(serverQueue) {
    if (!serverQueue.nowPlayingMsg || !serverQueue.songs[0]) return;
    const song = serverQueue.songs[0];
    const duration = song.duration || 180;
    const current = serverQueue.player.state.resource 
        ? serverQueue.player.state.resource.playbackDuration / 1000 
        : 0;

    const embed = buildNowPlayingEmbed(song, current);
    await serverQueue.nowPlayingMsg.edit({ embeds: [embed], components: buildMusicButtons() }).catch(() => {});
}

// ==========================
// 🚀 Phát nhạc
// ==========================
async function playSong(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        if (serverQueue.connection) serverQueue.connection.destroy();
        if (serverQueue.progressInterval) clearInterval(serverQueue.progressInterval);
        queue.delete(guild.id);
        return;
    }

    try {
        let resource;

        if (song.url.includes("soundcloud.com")) {
            // 🔊 SoundCloud
            const stream = await scdl.downloadFormat(song.url, scdl.FORMATS.OPUS);
            resource = createAudioResource(stream);
        } else {
            // 🔊 YouTube hoặc Spotify (Spotify redirect sang YouTube)
            const stream = ytdl(song.url, {
                filter: "audioonly",
                highWaterMark: 1 << 25,
                dlChunkSize: 0,
                quality: "highestaudio",
            });
            resource = createAudioResource(stream);

            stream.on("error", err => {
                console.error("Stream error:", err);
                serverQueue.songs.shift();
                playSong(guild, serverQueue.songs[0]);
            });
        }

        serverQueue.player.play(resource);

        if (serverQueue.progressInterval) clearInterval(serverQueue.progressInterval);
        serverQueue.progressInterval = setInterval(() => updateProgressBar(serverQueue), 5000);

        serverQueue.player.once(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            playSong(guild, serverQueue.songs[0]);
        });

        serverQueue.player.on("error", err => {
            console.error("Player error:", err);
            serverQueue.songs.shift();
            playSong(guild, serverQueue.songs[0]);
        });

    } catch (err) {
        console.error("PlaySong Fatal Error:", err);
        serverQueue.songs.shift();
        playSong(guild, serverQueue.songs[0]);
    }
}

// ==========================
// 📑 Hiển thị hàng chờ
// ==========================
async function showQueue(interaction, serverQueue, page = 0) {
    if (!serverQueue.songs.length) {
        return interaction.reply({ content: "📭 Hàng chờ trống!", flags: 64 });
    }

    const pageSize = 10;

    function generateQueueEmbed(page) {
        const start = page * pageSize;
        const end = start + pageSize;
        const currentSongs = serverQueue.songs.slice(start, end);

        return new EmbedBuilder()
            .setTitle("📑 Danh sách Order Nhạc")
            .setColor("Green")
            .setDescription(
                currentSongs
                    .map((s, i) => {
                        const index = start + i;
                        return index === 0
                            ? `🎶 **Đang phát:** [${s.title}](${s.url}) • ⏱️ ${formatTime(s.duration)}\n👤 Người order: **${s.requester}**`
                            : `#${index + 1} [${s.title}](${s.url}) • ⏱️ ${formatTime(s.duration)}\n👤 Order: **${s.requester}**`;
                    })
                    .join("\n\n")
            )
            .setFooter({ 
                text: `Trang ${page + 1}/${Math.ceil(serverQueue.songs.length / pageSize)} • Tổng: ${serverQueue.songs.length} bài` 
            });
    }

    await interaction.reply({
        embeds: [generateQueueEmbed(page)],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`queue_prev_${page}`).setLabel("⏮️ Trước").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`queue_next_${page}`).setLabel("⏭️ Sau").setStyle(ButtonStyle.Secondary),
            )
        ],
        flags: 64
    });
}

// ==========================
// Module export
// ==========================
module.exports = {
    // Lệnh /play
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("🎶 Phát nhạc YouTube / Spotify / SoundCloud")
        .addStringOption(opt =>
            opt.setName("query").setDescription("Tên bài hát hoặc link YouTube/Spotify/SoundCloud").setRequired(true)
        ),

    async execute(interaction, client) {
        const query = interaction.options.getString("query");
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.reply({ content: "❌ Bạn phải vào voice channel trước!", flags: 64 });

        await interaction.deferReply({ flags: 64 });

        let song = null;
        try {
            if (ytdl.validateURL(query)) {
                // 🎵 YouTube link
                const info = await ytdl.getInfo(query);
                if (info.videoDetails.isLiveContent) {
                    return interaction.editReply({ content: "❌ Không hỗ trợ livestream!", flags: 64 });
                }
                song = { 
                    title: info.videoDetails.title, 
                    url: info.videoDetails.video_url, 
                    duration: parseInt(info.videoDetails.lengthSeconds),
                    thumbnail: info.videoDetails.thumbnails[0].url,
                    requester: interaction.user.username
                };
            } else if (query.includes("soundcloud.com")) {
                // 🎵 SoundCloud
                const trackInfo = await scdl.getInfo(query);
                song = {
                    title: trackInfo.title,
                    url: trackInfo.permalink_url,
                    duration: Math.floor(trackInfo.duration / 1000),
                    thumbnail: trackInfo.artwork_url || null,
                    requester: interaction.user.username
                };
            } else if (query.includes("spotify.com")) {
                // 🎵 Spotify -> tìm YouTube
                const data = await getPreview(query);
                const searchResult = await ytSearch(`${data.title} ${data.artist}`);
                if (searchResult && searchResult.videos.length > 0) {
                    const video = searchResult.videos[0];
                    song = {
                        title: video.title,
                        url: video.url,
                        duration: video.seconds,
                        thumbnail: video.thumbnail,
                        requester: interaction.user.username
                    };
                }
            } else {
                // 🔍 Search YouTube
                const result = await ytSearch(query);
                if (result && result.videos.length > 0) {
                    const video = result.videos[0];
                    song = {
                        title: video.title, 
                        url: video.url, 
                        duration: video.seconds, 
                        thumbnail: video.thumbnail,
                        requester: interaction.user.username
                    };
                }
            }
        } catch (err) {
            console.error(err);
            return interaction.editReply({ content: "❌ Không thể xử lý link này!", flags: 64 });
        }

        if (!song) return interaction.editReply({ content: "❌ Không tìm thấy bài hát nào!", flags: 64 });

        let serverQueue = queue.get(interaction.guild.id);
        if (!serverQueue) {
            serverQueue = {
                textChannel: interaction.channel,
                voiceChannel,
                connection: null,
                songs: [],
                player: createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } }),
                nowPlayingMsg: null,
                progressInterval: null,
                owner: interaction.user.id
            };

            queue.set(interaction.guild.id, serverQueue);
            serverQueue.songs.push(song);

            try {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
                serverQueue.connection = connection;
                connection.subscribe(serverQueue.player);

                const embed = buildNowPlayingEmbed(song, 0);
                const msg = await interaction.channel.send({ embeds: [embed], components: buildMusicButtons() });
                serverQueue.nowPlayingMsg = msg;

                await interaction.editReply({ content: `🎶 Đang phát **${song.title}**!`, flags: 64 });
                playSong(interaction.guild, serverQueue.songs[0]);

            } catch (err) {
                console.error(err);
                queue.delete(interaction.guild.id);
                return interaction.editReply({ content: "❌ Lỗi khi kết nối voice channel!", flags: 64 });
            }
        } else {
            serverQueue.songs.push(song);
            await interaction.followUp({
                content: `✅ Đã thêm **${song.title}** vào hàng chờ (order bởi ${song.requester})!`,
                flags: 64 
            });
        }
    },

    // Xử lý nút nhấn
    async buttonHandler(interaction, client) {
        const serverQueue = queue.get(interaction.guild.id);
        if (!serverQueue) {
            return interaction.reply({ content: "❌ Không có nhạc đang phát!", flags: 64 }).catch(() => {});
        }

        if (interaction.customId !== "queue" && !interaction.customId.startsWith("queue_") && interaction.user.id !== serverQueue.owner) {
            return interaction.reply({ content: "❌ Bạn không phải người gọi lệnh, không thể điều khiển!", flags: 64 });
        }

        try {
            switch (true) {
                case interaction.customId === "pause":
                    serverQueue.player.pause();
                    await interaction.deferUpdate();
                    await interaction.followUp({ content: "⏸️ Đã tạm dừng!", flags: 64 });
                    break;

                case interaction.customId === "resume":
                    serverQueue.player.unpause();
                    await interaction.deferUpdate();
                    await interaction.followUp({ content: "▶️ Tiếp tục!", flags: 64 });
                    break;

                case interaction.customId === "skip":
                    serverQueue.player.stop();
                    await interaction.deferUpdate();
                    await interaction.followUp({ content: "⏭️ Đã bỏ qua!", flags: 64 });
                    break;

                case interaction.customId === "stop":
                    serverQueue.songs = [];
                    serverQueue.player.stop();
                    if (serverQueue.connection) serverQueue.connection.destroy();
                    if (serverQueue.progressInterval) clearInterval(serverQueue.progressInterval);
                    queue.delete(interaction.guild.id);
                    await interaction.deferUpdate();
                    await interaction.followUp({ content: "⏹️ Đã dừng và thoát voice!", flags: 64 });
                    break;

                case interaction.customId === "queue":
                    await showQueue(interaction, serverQueue, 0);
                    break;

                case interaction.customId.startsWith("queue_prev"):
                    {
                        const page = Math.max(0, parseInt(interaction.customId.split("_")[2]) - 1);
                        await showQueue(interaction, serverQueue, page);
                    }
                    break;

                case interaction.customId.startsWith("queue_next"):
                    {
                        const page = parseInt(interaction.customId.split("_")[2]) + 1;
                        await showQueue(interaction, serverQueue, page);
                    }
                    break;
            }
        } catch (err) {
            console.error("ButtonHandler Error:", err);
            await interaction.deferUpdate().catch(() => {});
        }
    },

    // Lệnh /nowplaying
    nowplaying: {
        data: new SlashCommandBuilder()
            .setName("nowplaying")
            .setDescription("🎶 Xem bài hát hiện tại"),
        async execute(interaction) {
            const serverQueue = queue.get(interaction.guild.id);
            if (!serverQueue || !serverQueue.songs.length) {
                return interaction.reply({ content: "❌ Không có nhạc đang phát!", flags: 64 });
            }

            const song = serverQueue.songs[0];
            const current = serverQueue.player.state.resource 
                ? serverQueue.player.state.resource.playbackDuration / 1000 
                : 0;

            const embed = buildNowPlayingEmbed(song, current);
            await interaction.reply({ embeds: [embed], flags: 64 });
        }
    }
};