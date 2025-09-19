const { ChannelType, PermissionFlagsBits, Events } = require("discord.js");

const CATEGORY_NAME = "📊 Server Stats";

async function setupServerStats(guild) {
    try {
        // ❌ Không cần fetch toàn bộ members
        // await guild.members.fetch();

        // 🔎 Tìm hoặc tạo category
        let category = guild.channels.cache.find(
            c => c.type === ChannelType.GuildCategory && c.name === CATEGORY_NAME
        );
        if (!category) {
            category = await guild.channels.create({
                name: CATEGORY_NAME,
                type: ChannelType.GuildCategory,
                position: 0
            });
        } else {
            await category.setPosition(0); // Đưa category lên đầu
        }

        // 📊 Lấy số liệu
        const total = guild.memberCount;
        const online = guild.members.cache.filter(
            m => m.presence?.status === "online" ||
                 m.presence?.status === "idle" ||
                 m.presence?.status === "dnd"
        ).size;
        const offline = total - online;

        // Danh sách kênh stats
        const channelsData = [
            { prefix: "👥 Members", value: total },
            { prefix: "🟢 Online", value: online },
            { prefix: "🔴 Offline", value: offline }
        ];

        // Kiểm tra hoặc tạo channel
        for (const data of channelsData) {
            const newName = `${data.prefix} | ${data.value}`;
            let channel = guild.channels.cache.find(
                c => c.parentId === category.id &&
                     c.type === ChannelType.GuildVoice &&
                     c.name.startsWith(data.prefix)
            );

            if (!channel) {
                await guild.channels.create({
                    name: newName,
                    type: ChannelType.GuildVoice,
                    parent: category.id,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.Connect] }
                    ]
                });
            } else if (channel.name !== newName) {
                await channel.setName(newName);
            }
        }
    } catch (err) {
        console.error(`❌ Lỗi khi setup server stats cho ${guild.name}:`, err);
    }
}

// 🔁 Đăng ký sự kiện update realtime
function registerServerStatsEvents(client) {
    client.on(Events.GuildMemberAdd, member => setupServerStats(member.guild));
    client.on(Events.GuildMemberRemove, member => setupServerStats(member.guild));
    client.on(Events.PresenceUpdate, (_, newPresence) => {
        if (newPresence?.guild) setupServerStats(newPresence.guild);
    });

    // Auto refresh mỗi phút
    setInterval(() => {
        client.guilds.cache.forEach(guild => setupServerStats(guild));
    }, 60 * 1000);
}

module.exports = { setupServerStats, registerServerStatsEvents };
