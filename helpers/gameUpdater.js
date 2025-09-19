const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

// === Epic Free Games ===
async function getEpicFreeGames() {
  const url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions";
  try {
    const res = await fetch(url);
    const data = await res.json();

    return data.data.Catalog.searchStore.elements
      .filter(g => g.promotions && g.promotions.promotionalOffers.length > 0)
      .map(g => {
        const offer = g.promotions.promotionalOffers[0].promotionalOffers[0];
        return {
          store: "Epic",
          title: g.title,
          url: `https://store.epicgames.com/p/${g.productSlug}`,
          startDate: offer.startDate,
          endDate: offer.endDate,
          free: true
        };
      });
  } catch (err) {
    console.error("❌ Lỗi lấy Epic Games:", err.message);
    return [];
  }
}

// === CheapShark API (Steam Sale + Free) ===
async function getSteamSales() {
  const url = "https://www.cheapshark.com/api/1.0/deals?storeID=1&pageSize=5&sortBy=Deal%20Rating";
  try {
    const res = await fetch(url);
    const data = await res.json();

    return data.map(d => ({
      store: "Steam",
      title: d.title,
      url: `https://store.steampowered.com/app/${d.steamAppID}`,
      normalPrice: d.normalPrice,
      salePrice: d.salePrice,
      discount: d.savings,
      free: parseFloat(d.salePrice) === 0
    }));
  } catch (err) {
    console.error("❌ Lỗi lấy Steam Sales:", err.message);
    return [];
  }
}

// === Gửi Discord ===
async function sendGameUpdate(client, channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error("❌ Không tìm thấy channel:", channelId);
      return;
    }

    const epic = await getEpicFreeGames();
    const steam = await getSteamSales();

    // Lọc các nhóm game
    const steamFree = steam.filter(g => g.free);
    const steamSale = steam.filter(g => !g.free);

    // === Embed ===
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("🎮 Cập nhật game hôm nay")
      .setDescription("Danh sách game miễn phí và giảm giá mới nhất từ Epic Games và Steam.")
      .setFooter({ text: `Cập nhật lúc ${new Date().toLocaleString("vi-VN")}` })
      .setTimestamp();

    // Epic Free Games
    if (epic.length > 0) {
      embed.addFields({
        name: "🆓 Game miễn phí (Epic)",
        value: epic
          .map(
            g => `- [${g.title}](${g.url})\n⏳ ${g.startDate.split("T")[0]} → ${g.endDate.split("T")[0]}`
          )
          .join("\n"),
      });
    } else {
      embed.addFields({
        name: "🆓 Game miễn phí (Epic)",
        value: "Không có game miễn phí nào hôm nay.",
      });
    }

    // Steam Free Games
    if (steamFree.length > 0) {
      embed.addFields({
        name: "🆓 Game miễn phí (Steam)",
        value: steamFree.map(g => `- [${g.title}](${g.url})`).join("\n"),
      });
    }

    // Steam Sales
    if (steamSale.length > 0) {
      embed.addFields({
        name: "💸 Game giảm giá (Steam)",
        value: steamSale
          .map(
            g => `- [${g.title}](${g.url}) ~~${g.normalPrice}$~~ → **${g.salePrice}$** (-${Math.round(g.discount)}%)`
          )
          .join("\n"),
      });
    } else {
      embed.addFields({
        name: "💸 Game giảm giá (Steam)",
        value: "Không có game giảm giá nổi bật nào hôm nay.",
      });
    }

    // Gửi lên Discord
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("❌ Lỗi sendGameUpdate:", err.message);
  }
}

module.exports = { sendGameUpdate };
