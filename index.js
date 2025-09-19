require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    Collection,
    EmbedBuilder,
    Events,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Partials
} = require("discord.js");
const fs = require("fs");

// ===== Helpers =====
const { sendWeatherUpdate } = require("./helpers/weatherUpdater");
const { sendGameUpdate } = require("./helpers/gameUpdater");
const { sendMovieUpdate } = require("./helpers/movieUpdater");
const { setupServerStats, registerServerStatsEvents } = require("./helpers/serverStatsUpdater");
const { checkBirthdays } = require("./helpers/birthdayManager");
const { registerConfessionEvents } = require("./commands/confession.js");
const { registerAutoMod } = require("./helpers/autoMod");
const { sendTrafficUpdate } = require("./helpers/trafficUpdater");

// ===== Kiểm tra ENV =====
if (!process.env.TOKEN) console.error("❌ Thiếu TOKEN trong .env");
if (!process.env.WEATHER_API_KEY) console.warn("⚠️ Thiếu WEATHER_API_KEY trong .env (weather có thể lỗi)");
if (!process.env.NEWS_API_KEY) console.warn("⚠️ Thiếu NEWS_API_KEY trong .env (sports có thể lỗi)");

// ===== Khởi tạo bot =====
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions, // Giveaway
        GatewayIntentBits.GuildPresences         // Server stats
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ]
});
client.commands = new Collection();

// ===== ID kênh và category =====
const weatherChannelId = "1416447518438326487";
const freeGameChannelId = "1416447840150098111";
const movieChannelId = "1416447555549663366";
const birthdayChannelId = "1417514698424717363";
const ticketCategoryId = "1416447486457020577";
const ticketLogChannelId = "1416447526395056128";
const trafficChannelId = "1418266235854000200"; // ID kênh cập nhật giao thông

// ===== Load commands =====
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
const seenCommands = new Set();

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (!command.data?.name) {
        console.warn(`⚠️ File ${file} thiếu "data.name", bỏ qua.`);
        continue;
    }
    if (seenCommands.has(command.data.name)) {
        console.warn(`⚠️ Lệnh "${command.data.name}" bị trùng, bỏ qua file: ${file}`);
        continue;
    }
    seenCommands.add(command.data.name);
    client.commands.set(command.data.name, command);
}

// ===== Load events =====
const eventFiles = fs.readdirSync("./events").filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
    const events = require(`./events/${file}`);

    if (Array.isArray(events)) {
        // Nếu file export nhiều event
        for (const evt of events) {
            if (evt.once) {
                client.once(evt.name, (...args) => evt.execute(...args, client));
            } else {
                client.on(evt.name, (...args) => evt.execute(...args, client));
            }
        }
    } else {
        // Nếu file export 1 event duy nhất
        if (events.once) {
            client.once(events.name, (...args) => events.execute(...args, client));
        } else {
            client.on(events.name, (...args) => events.execute(...args, client));
        }
    }
}

// ===== Khi bot online =====
client.once(Events.ClientReady, () => {
    console.log(`✅ Bot đã đăng nhập thành công với tên: ${client.user.tag}`);

    // ========== Cập nhật ngay khi bot khởi động ==========

    sendWeatherUpdate(client, weatherChannelId);
    sendGameUpdate(client, freeGameChannelId);
    sendMovieUpdate(client, movieChannelId);

    // Kiểm tra xem kênh giao thông có tồn tại trước khi gửi
    if (trafficChannelId) {
        sendTrafficUpdate(client, trafficChannelId)
            .catch(err => console.error("❌ Lỗi khi gửi cập nhật giao thông lần đầu:", err));
    } else {
        console.warn("⚠️ Không tìm thấy trafficChannelId, bỏ qua cập nhật giao thông.");
    }

    // ========== Lặp update định kỳ ==========
    // Thời tiết: 1 giờ
    setInterval(() => {
        sendWeatherUpdate(client, weatherChannelId);
    }, 5 * 60 * 1000);

    // Game miễn phí: 1 giờ
    setInterval(() => {
        sendGameUpdate(client, freeGameChannelId);
    }, 60 * 60 * 1000);

    // Phim: 24 giờ
    setInterval(() => {
        sendMovieUpdate(client, movieChannelId);
    }, 24 * 60 * 60 * 1000);

    // Giao thông: 1 phút
    setInterval(() => {
        sendTrafficUpdate(client, trafficChannelId).catch(err =>
            console.error("❌ Lỗi khi cập nhật giao thông tự động:", err)
        );
    }, 1 * 60 * 1000);

    // ========== Server Stats ==========
    client.guilds.cache.forEach(guild => setupServerStats(guild));
    registerServerStatsEvents(client);

    // ========== Birthday ==========
    checkBirthdays(client, birthdayChannelId);
    setInterval(() => {
        checkBirthdays(client, birthdayChannelId);
    }, 24 * 60 * 60 * 1000);

    // ========== AutoMod ==========
    registerAutoMod(client);

    // ========== Confession ==========
    registerConfessionEvents(client);

});

// ===== Interaction Handler =====
client.on(Events.InteractionCreate, async interaction => {
    try {
        // Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction, client);
        }

        // Buttons
        if (interaction.isButton()) {
            const customId = interaction.customId;

            // 🎵 Music buttons
            const music = require("./commands/music.js");
            const musicButtons = ["pause", "resume", "skip", "loop", "stop", "queue", "prevPage", "nextPage"];
            if (music.buttonHandler && musicButtons.includes(customId)) {
                return await music.buttonHandler(interaction, client);
            }

            // 🔨 Unban
            if (customId.startsWith("unban_")) {
                return handleUnban(interaction);
            }

            // 🎫 Ticket
            if (["ticket_support", "ticket_report", "ticket_donate"].includes(customId)) {
                return handleCreateTicket(interaction, client);
            }
            if (customId === "close_ticket") {
                return handleCloseTicket(interaction, client);
            }

            // ✊✋✌ Oẳn Tù Tì
            if (customId.startsWith("rps_")) {
                return handleRPS(interaction);
            }
        }
    } catch (err) {
        console.error("❌ Interaction Error:", err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "❌ Có lỗi xảy ra!", flags: 64 }).catch(() => {});
        }
    }
});


// ===== Handler Functions =====

// 🛡️ Unban Handler
async function handleUnban(interaction) {
    const userId = interaction.customId.split("_")[1];

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: "❌ Bot không có quyền **Unban**!", flags: 64 });
    }

    const member = interaction.member || await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: "❌ Bạn không có quyền **Unban**!", flags: 64 });
    }

    const banList = await interaction.guild.bans.fetch();
    if (!banList.has(userId)) {
        return interaction.reply({ content: `❌ Người dùng <@${userId}> hiện không bị ban!`, flags: 64 });
    }

    await interaction.guild.members.unban(userId, "Unban bằng nút");

    // Disable nút
    const msg = await interaction.message.fetch();
    const newComponents = msg.components.map(row =>
        new ActionRowBuilder().addComponents(
            row.components.map(button => {
                if (button.customId === interaction.customId) {
                    return ButtonBuilder.from(button).setDisabled(true);
                }
                return button;
            })
        )
    );
    await msg.edit({ components: newComponents });

    return interaction.reply({ content: `✅ <@${interaction.user.id}> đã unban <@${userId}>!` });
}

// 🎫 Tạo Ticket
async function handleCreateTicket(interaction, client) {
    const guild = interaction.guild;
    const user = interaction.user;
    const type = interaction.customId.replace("ticket_", ""); // support/report/donate

    const existing = guild.channels.cache.find(c => c.name === `ticket-${user.id}-${type}`);
    if (existing) {
        return interaction.reply({ content: `❌ Bạn đã có ticket: ${existing}`, flags: 64 });
    }

    try {
        const channel = await guild.channels.create({
            name: `ticket-${user.id}-${type}`,
            type: ChannelType.GuildText,
            parent: ticketCategoryId,
            topic: `${user.id}`, // lưu id user mở ticket
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle(`🎫 Ticket - ${type.toUpperCase()}`)
            .setDescription("Vui lòng mô tả chi tiết.\nKhi xong, bấm **🔒 Đóng Ticket**.")
            .setColor("Blue");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("🔒 Đóng Ticket")
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({
            content: `<@${user.id}> Ticket của bạn đã được tạo!`,
            embeds: [embed],
            components: [row]
        });

        return interaction.reply({ content: `✅ Ticket đã được tạo: ${channel}`, flags: 64 });
    } catch (err) {
        console.error("❌ Lỗi tạo ticket:", err);
        return interaction.reply({ content: "❌ Không thể tạo ticket!", flags: 64 });
    }
}

// 🎫 Đóng Ticket
async function handleCloseTicket(interaction) {
    if (!interaction.channel.name.startsWith("ticket-")) {
        return interaction.reply({ content: "❌ Đây không phải là kênh ticket!", flags: 64 });
    }

    const member = interaction.member;
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: "❌ Chỉ admin hoặc mod mới có thể đóng ticket!", flags: 64 });
    }

    await interaction.reply({ content: "✅ Ticket sẽ được đóng sau 5 giây...", flags: 64 });

    // Lưu transcript
    try {
        const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = fetchedMessages
            .map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`)
            .reverse()
            .join("\n");

        const logChannel = interaction.guild.channels.cache.get(ticketLogChannelId);
        if (logChannel) {
            await logChannel.send({
                content: `📑 **Transcript Ticket**: ${interaction.channel.name}\n👤 Người mở: <@${interaction.channel.topic || "?"}>`,
                files: [{ attachment: Buffer.from(transcript, "utf-8"), name: `${interaction.channel.name}.txt` }]
            });
        }
    } catch (err) {
        console.error("❌ Không thể gửi log ticket:", err);
    }

    setTimeout(async () => {
        await interaction.channel.delete().catch(() => {});
    }, 5000);
}

// ✊✋✌ Oẳn Tù Tì (RPS)
async function handleRPS(interaction) {
    await interaction.deferUpdate(); // tránh lỗi Unknown interaction

    if (interaction.customId === "rps_quit") {
        const embed = new EmbedBuilder()
            .setTitle("✊✋✌ Oẳn Tù Tì")
            .setDescription("❌ Bạn đã thoát game.")
            .setColor("Red");

        return interaction.message.edit({ embeds: [embed], components: [] });
    }

    const userChoice = interaction.customId.replace("rps_", "");
    const choices = ["✊", "✋", "✌"];
    const labels = { "✊": "✊ Kéo", "✋": "✋ Bao", "✌": "✌ Búa" };

    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    let result;
    if (userChoice === botChoice) result = "🤝 Hòa rồi!";
    else if (
        (userChoice === "✊" && botChoice === "✌") ||
        (userChoice === "✋" && botChoice === "✊") ||
        (userChoice === "✌" && botChoice === "✋")
    ) result = "🎉 Bạn thắng!";
    else result = "🤖 Bot thắng!";

    const embed = new EmbedBuilder()
        .setTitle("✊✋✌ Oẳn Tù Tì")
        .setDescription(
            `👉 Bạn chọn: **${labels[userChoice]}**\n` +
            `🤖 Bot chọn: **${labels[botChoice]}**\n\n` +
            `${result}\n\n➡️ Chọn tiếp để chơi nữa hoặc ❌ Thoát.`
        )
        .setColor("Random");

    await interaction.message.edit({ embeds: [embed] });
}

// ===== Login =====
client.login(process.env.TOKEN);
