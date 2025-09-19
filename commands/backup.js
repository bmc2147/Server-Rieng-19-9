const { SlashCommandBuilder, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");

const BACKUP_DIR = path.join(__dirname, "../backups");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

module.exports = {
    data: new SlashCommandBuilder()
        .setName("backup")
        .setDescription("📦 Sao lưu và khôi phục cài đặt server")
        .addSubcommand(sub =>
            sub.setName("create")
                .setDescription("Tạo file backup server")
                .addStringOption(opt =>
                    opt.setName("name")
                        .setDescription("Tên file backup (mặc định: backup.json)")
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName("restore")
                .setDescription("Khôi phục server từ file backup")
                .addStringOption(opt =>
                    opt.setName("name")
                        .setDescription("Tên file backup (mặc định: backup.json)")
                        .setRequired(false))),

    async execute(interaction) {
        // ✅ Chỉ bạn mới được dùng
        if (interaction.user.id !== "1307649035385049172") {
            return interaction.reply({
                content: "❌ Bạn không có quyền dùng lệnh này!",
                ephemeral: true
            });
        }

        const sub = interaction.options.getSubcommand();
        const name = interaction.options.getString("name") || "backup.json";
        const filePath = path.join(BACKUP_DIR, name);
        const guild = interaction.guild;

        // ================== 📦 BACKUP ==================
        if (sub === "create") {
            const data = {
                name: guild.name,
                icon: guild.iconURL(),
                roles: guild.roles.cache
                    .filter(r => r.name !== "@everyone")
                    .map(r => ({
                        name: r.name,
                        color: r.color,
                        permissions: r.permissions?.bitfield?.toString() || "0",
                        hoist: r.hoist,
                        mentionable: r.mentionable,
                        position: r.position
                    })),
                categories: guild.channels.cache
                    .filter(ch => ch.type === ChannelType.GuildCategory)
                    .map(ch => ({ name: ch.name, position: ch.position })),
                channels: guild.channels.cache
                    .filter(ch => ch.type !== ChannelType.GuildCategory)
                    .map(ch => ({
                        name: ch.name,
                        type: ch.type,
                        parent: ch.parent?.name || null,
                        position: ch.position,
                        overwrites: ch.permissionOverwrites.cache.map(po => ({
                            id: po.id,
                            allow: po.allow?.bitfield?.toString() || "0",
                            deny: po.deny?.bitfield?.toString() || "0",
                            type: po.type
                        }))
                    })),
                emojis: guild.emojis.cache.map(e => ({
                    name: e.name,
                    url: e.imageURL()
                })),
                stickers: guild.stickers.cache.map(s => ({
                    name: s.name,
                    description: s.description,
                    tags: s.tags,
                    format: s.format,
                    url: s.url
                }))
            };

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return interaction.reply(`✅ Đã tạo backup: \`${name}\``);
        }

        // ================== ♻️ RESTORE ==================
        if (sub === "restore") {
            if (!fs.existsSync(filePath)) {
                return interaction.reply(`❌ Không tìm thấy backup: \`${name}\``);
            }

            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

            // 🔹 Tạo kênh log
            const logChannel = await guild.channels.create({
                name: "server-restore-log",
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: ["SendMessages"], // chỉ xem, không chat
                    }
                ]
            });

            await interaction.reply({
                content: `♻️ Đang khôi phục server... Xem tiến trình tại ${logChannel}`,
                ephemeral: true
            });

            await logChannel.send("🚀 Bắt đầu khôi phục server...");

            // 🔹 Xóa toàn bộ kênh cũ (trừ log)
            for (const channel of guild.channels.cache.values()) {
                if (channel.id !== logChannel.id) {
                    await channel.delete().catch(() => {});
                }
            }
            await logChannel.send("🗑️ Đã xoá toàn bộ kênh cũ!");

            // 🔹 Đổi tên & icon server
            try {
                await guild.setName(data.name || guild.name);
                if (data.icon) {
                    await guild.setIcon(data.icon);
                }
                await logChannel.send("🖼️ Đã khôi phục tên & icon server!");
            } catch (err) {
                await logChannel.send("⚠️ Không thể đổi tên/icon server.");
            }

            // 🔹 Roles
            for (const roleData of (data.roles || []).sort((a, b) => a.position - b.position)) {
                if (!guild.roles.cache.find(r => r.name === roleData.name)) {
                    await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color || null,
                        hoist: roleData.hoist || false,
                        mentionable: roleData.mentionable || false,
                        permissions: roleData.permissions ? BigInt(roleData.permissions) : []
                    }).catch(err => console.warn("⚠️ Lỗi tạo role:", err.message));
                }
            }
            await logChannel.send("🔑 Đã khôi phục roles!");

            // 🔹 Categories
            const categoryMap = {};
            for (const catData of (data.categories || []).sort((a, b) => a.position - b.position)) {
                const category = await guild.channels.create({
                    name: catData.name,
                    type: ChannelType.GuildCategory,
                    position: catData.position
                }).catch(() => null);
                if (category) categoryMap[catData.name] = category.id;
            }
            await logChannel.send("📂 Đã khôi phục categories!");

            // 🔹 Channels + Overwrites
            for (const chData of (data.channels || []).sort((a, b) => a.position - b.position)) {
                const parentId = chData.parent ? categoryMap[chData.parent] : null;
                const channel = await guild.channels.create({
                    name: chData.name,
                    type: chData.type,
                    parent: parentId,
                    position: chData.position
                }).catch(() => null);

                if (channel && Array.isArray(chData.overwrites)) {
                    for (const ow of chData.overwrites) {
                        await channel.permissionOverwrites.create(ow.id, {
                            allow: ow.allow ? BigInt(ow.allow) : 0n,
                            deny: ow.deny ? BigInt(ow.deny) : 0n
                        }).catch(() => {});
                    }
                }
            }
            await logChannel.send("💬 Đã khôi phục channels + quyền!");

            // 🔹 Emojis
            for (const emojiData of (data.emojis || [])) {
                if (!guild.emojis.cache.find(e => e.name === emojiData.name)) {
                    await guild.emojis.create({
                        name: emojiData.name,
                        attachment: emojiData.url
                    }).catch(() => {});
                }
            }
            await logChannel.send("😀 Đã khôi phục emojis!");

            // 🔹 Stickers
            if (Array.isArray(data.stickers)) {
                for (const stickerData of data.stickers) {
                    if (!guild.stickers.cache.find(s => s.name === stickerData.name)) {
                        await guild.stickers.create({
                            name: stickerData.name,
                            description: stickerData.description || "",
                            tags: stickerData.tags || "🙂",
                            file: stickerData.url
                        }).catch(() => {});
                    }
                }
                await logChannel.send("🏷️ Đã khôi phục stickers!");
            } else {
                await logChannel.send("⚠️ Không có sticker nào trong backup.");
            }

            await logChannel.send("✅ Khôi phục server hoàn tất!");
        }
    }
};
