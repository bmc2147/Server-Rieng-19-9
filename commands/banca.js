const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");
const fs = require("fs");

// ==================== FILE CONFIG ==================== //
const USERS_FILE = "./users.json";
const JACKPOT_FILE = "./jackpot.json";

// ==================== JSON HELPER ==================== //
function loadJSON(filePath, defaultValue = {}) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch {
    return defaultValue;
  }
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadUsers() {
  return loadJSON(USERS_FILE, {});
}

function saveUsers(users) {
  saveJSON(USERS_FILE, users);
}

function loadJackpot() {
  return loadJSON(JACKPOT_FILE, { amount: 0 });
}

function saveJackpot(jackpot) {
  saveJSON(JACKPOT_FILE, jackpot);
}

// ==================== CẤU HÌNH CÁ ==================== //
const fishTypes = [
  { emoji: "🐟", name: "Cá Nhỏ", chance: 25, multiplier: 1.5 },
  { emoji: "🐠", name: "Cá Trung", chance: 20, multiplier: 2 },
  { emoji: "🐳", name: "Cá Lớn", chance: 15, multiplier: 4 },
  { emoji: "🐋", name: "Cá Khủng", chance: 5, multiplier: 8 },
  { emoji: "💀", name: "Mìn Nổ", chance: 35, multiplier: 0 },
];

// Random loại cá theo tỷ lệ xác suất
function randomFish() {
  const total = fishTypes.reduce((sum, fish) => sum + fish.chance, 0);
  const rand = Math.random() * total;
  let acc = 0;

  for (const fish of fishTypes) {
    acc += fish.chance;
    if (rand < acc) return fish;
  }
  return fishTypes[0];
}

// ==================== COMMAND ==================== //
module.exports = {
  data: new SlashCommandBuilder()
    .setName("banca")
    .setDescription("🎣 Bắn cá để kiếm coins với hiệu ứng chuyển động!")
    .addIntegerOption(opt =>
      opt.setName("bet")
        .setDescription("Số coins cược cho mỗi phát bắn (>= 10)")
        .setRequired(true)
        .setMinValue(10)
    )
    .addIntegerOption(opt =>
      opt.setName("shots")
        .setDescription("Số phát bắn (1-5)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    const users = loadUsers();
    const jackpot = loadJackpot();

    // Khởi tạo tài khoản nếu chưa có
    if (!users[userId]) {
      users[userId] = { coins: 1000, lastDaily: null };
      saveUsers(users);
    }

    const bet = interaction.options.getInteger("bet", true);
    const shots = interaction.options.getInteger("shots", true);
    const shotsClamped = Math.max(1, Math.min(5, shots));
    const totalCost = bet * shotsClamped;

    const balanceBefore = users[userId].coins;

    // Kiểm tra đủ tiền
    if (balanceBefore < totalCost) {
      return interaction.reply({
        content: `❌ Bạn cần **${totalCost}** coins cho ${shotsClamped} phát bắn.\n💳 Số dư hiện tại: **${balanceBefore}**`,
        ephemeral: true,
      });
    }

    // Trừ tiền cược ngay khi bắt đầu
    users[userId].coins -= totalCost;
    saveUsers(users);

    const jackpotBefore = jackpot.amount;
    let totalWin = 0;             // Tổng tiền thắng từ tất cả cá
    const perShotLines = [];

    // ==================== EMBED BAN ĐẦU ==================== //
    const embed = new EmbedBuilder()
      .setTitle("🎣 BẮN CÁ BẮT ĐẦU!")
      .setColor("Yellow")
      .setDescription(
        [
          `👤 Người chơi: **${username}**`,
          `💳 Số dư trước: **${balanceBefore}**`,
          `🎯 Cược/Phát: **${bet}**, 🔫 Số phát: **${shotsClamped}**`,
          `🏦 Jackpot hiện tại: **${jackpotBefore}**`,
          "",
          `⏳ Chuẩn bị bắn...`
        ].join("\n")
      );

    const gameMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

    // ==================== XỬ LÝ MỖI PHÁT ==================== //
    for (let i = 1; i <= shotsClamped; i++) {
      // Hiệu ứng cá bơi
      const swimFrames = [
        "🌊 ~ 🐟",
        "🌊 ~~ 🐟",
        "🌊 ~~~ 🐟"
      ];

      for (let frame of swimFrames) {
        embed.setDescription(
          [
            `👤 Người chơi: **${username}**`,
            `🎯 Cược/Phát: **${bet}**, 🔫 Số phát: **${shotsClamped}**`,
            "",
            `📋 **Kết quả đi săn:**`,
            ...perShotLines,
            "",
            `⏳ Đang bắn phát ${i}/${shotsClamped}...`,
            `\`\`\`${frame}\`\`\``
          ].join("\n")
        );
        await gameMessage.edit({ embeds: [embed] });
        await new Promise(r => setTimeout(r, 400));
      }

      // Random kết quả
      const fish = randomFish();

      if (fish.emoji === "💀") {
        // ======== DÍNH MÌN 💀 ========
        const addToJackpot = Math.floor(bet * 0.30);
        jackpot.amount += addToJackpot;
        totalWin -= bet * 2; // Thua gấp đôi tiền cược

        perShotLines.push(
          `${i}. ${fish.emoji} **${fish.name}** → **-${bet * 2}** (Jackpot +${addToJackpot})`
        );

      } else {
        // ======== CÁ TRÚNG THƯỞNG ========
        let win = Math.floor(bet * fish.multiplier);

        // Nếu trúng cá khủng, cộng Jackpot trực tiếp
        if (fish.emoji === "🐋" && jackpot.amount > 0) {
          win += jackpot.amount;
          jackpot.amount = 0;
        }

        totalWin += win;

        perShotLines.push(
          `${i}. ${fish.emoji} **${fish.name}** → +${win} (x${fish.multiplier}${fish.emoji === "🐋" ? " + Jackpot" : ""})`
        );
      }

      // Chờ một chút để nhìn rõ từng phát
      await new Promise(r => setTimeout(r, 800));
    }

    // ==================== HOÀN TẤT & TÍNH KẾT QUẢ ==================== //
    const net = totalWin - totalCost; // Lãi/Lỗ có thể âm

    // Cộng số tiền thắng cuối cùng vào tài khoản
    users[userId].coins += totalWin;
    saveUsers(users);
    saveJackpot(jackpot);

    const color = net >= 0 ? "Green" : "Red";

    embed.setTitle("🎣 KẾT QUẢ CUỐI CÙNG")
      .setColor(color)
      .setDescription(
        [
          `👤 Người chơi: **${username}**`,
          `💳 Số dư trước: **${balanceBefore}**`,
          `🏦 Jackpot trước lượt: **${jackpotBefore}**`,
          "",
          `📋 **Kết quả từng phát:**`,
          ...perShotLines,
          "",
          `🐟 Tổng thắng từ cá: **${totalWin}**`,
          `💰 Tổng đã cược: **${totalCost}**`,
          `🧮 Lãi/Lỗ: **${net >= 0 ? "+" : ""}${net}**`,
          `🏦 Jackpot hiện tại: **${jackpot.amount}**`,
          `📥 Số dư sau: **${users[userId].coins}**`,
        ].join("\n")
      );

    await gameMessage.edit({ embeds: [embed] });
  },
};
