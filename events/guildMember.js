const { Events, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const autoRoleId = "1415708348199735378"; 
const welcomeChannelId = "1416447498997862420"; 
const goodbyeChannelId = "1416447498997862420"; 
const configPath = path.join(__dirname, "../serverConfig.json");

function loadConfig() {
    if (!fs.existsSync(configPath)) return {};
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

module.exports = [
    // 🟢 Khi có thành viên mới
    {
        name: Events.GuildMemberAdd,
        async execute(member) {
            try {
                const config = loadConfig();
                const serverConfig = config[member.guild.id];

                // 1️⃣ AntiRaid
                if (serverConfig?.antiraid) {
                    const accountAge = Date.now() - member.user.createdTimestamp;
                    const minAge = 1000 * 60 * 60 * 24 * 3; // 3 ngày
                    if (accountAge < minAge) {
                        try {
                            await member.kick("AntiRaid: Account mới tạo, nghi ngờ raid");
                            console.log(`🚨 Kick ${member.user.tag} do AntiRaid.`);
                            return;
                        } catch (err) {
                            console.error("❌ Không kick được:", err);
                        }
                    }
                }

                // 2️⃣ Auto role
                const role = member.guild.roles.cache.get(autoRoleId);
                if (role) {
                    await member.roles.add(role);
                    console.log(`✅ Auto role: ${role.name} → ${member.user.tag}`);
                }

                // 3️⃣ Welcome embed
                const channel = member.guild.channels.cache.get(welcomeChannelId);
                if (!channel) return;
                if (!channel.permissionsFor(member.guild.members.me).has("SendMessages")) return;

                const welcomeEmbed = new EmbedBuilder()
                    .setColor("#00ffcc")
                    .setTitle("🎉 Chào mừng thành viên mới!")
                    .setDescription(
                        `Xin chào <@${member.id}>! Rất vui khi bạn tham gia **${member.guild.name}** ✨`
                    )
                    .setThumbnail(member.user.displayAvatarURL())
                    .setImage("https://cdn.discordapp.com/attachments/1416447557676306472/1418549571478487202/bANER.gif") // banner GIF
                    .setFooter({
                        text: `Thành viên thứ ${member.guild.memberCount}`,
                        iconURL: member.guild.iconURL(),
                    })
                    .setTimestamp();

                await channel.send({ embeds: [welcomeEmbed] });
            } catch (error) {
                console.error("❌ Lỗi GuildMemberAdd:", error);
            }
        }
    },

    // 🔴 Khi có thành viên rời server
    {
        name: Events.GuildMemberRemove,
        async execute(member) {
            try {
                const goodbyeChannel = member.guild.channels.cache.get(goodbyeChannelId);
                if (goodbyeChannel) {
                    const goodbyeEmbed = new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("👋 Tạm biệt!")
                        .setDescription(
                            `Rất tiếc khi phải chia tay **${member.user.tag}**.\n` +
                            "Chúc bạn mọi điều tốt lành ngoài kia nhé ❤️"
                        )
                        .setThumbnail(member.user.displayAvatarURL())
                        .setImage("https://cdn.discordapp.com/attachments/1416447557676306472/1418549571478487202/bANER.gif") // banner GIF
                        .setFooter({ text: `Server: ${member.guild.name}` })
                        .setTimestamp();

                    await goodbyeChannel.send({ embeds: [goodbyeEmbed] });
                }

                try {
                    await member.send(
                        `👋 Chào **${member.user.username}**, bạn vừa rời server **${member.guild.name}**.\n` +
                        `Nếu muốn quay lại, đây là link vĩnh viễn: https://discord.gg/KjV43gcc7M`
                    );
                } catch {
                    console.log(`⚠️ Không thể gửi DM cho ${member.user.tag}, có thể họ tắt DM.`);
                }
            } catch (error) {
                console.error("❌ Lỗi GuildMemberRemove:", error);
            }
        }
    }
];
