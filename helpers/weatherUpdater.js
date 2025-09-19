const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch"); // Bắt buộc cài: npm install node-fetch

// ==========================
// Hàm chuyển hướng gió thành chữ
// ==========================
function degToCompass(num) {
  const val = Math.floor((num / 22.5) + 0.5);
  const arr = [
    "Bắc", "Bắc-Đông Bắc", "Đông Bắc", "Đông-Đông Bắc",
    "Đông", "Đông-Đông Nam", "Đông Nam", "Nam-Đông Nam",
    "Nam", "Nam-Tây Nam", "Tây Nam", "Tây-Tây Nam",
    "Tây", "Tây-Tây Bắc", "Tây Bắc", "Bắc-Tây Bắc"
  ];
  return arr[val % 16];
}

// ==========================
// Hàm format giờ UTC -> Việt Nam (UTC+7)
// ==========================
function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh", // Bắt buộc timezone Việt Nam
  });
}

// ==========================
// Gửi cập nhật thời tiết
// ==========================
async function sendWeatherUpdate(client, channelId) {
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    const city = process.env.WEATHER_CITY || "Hanoi,VN";

    if (!apiKey) {
      console.error("❌ Thiếu WEATHER_API_KEY trong .env");
      return;
    }

    // Gọi API OpenWeather
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=vi`
    );

    if (!res.ok) {
      throw new Error(`API lỗi: ${res.statusText}`);
    }

    const weather = await res.json();
    
    // Bình minh và hoàng hôn
    const sunrise = formatTime(weather.sys.sunrise);
    const sunset = formatTime(weather.sys.sunset);

    const windDir = degToCompass(weather.wind.deg);

    // ==========================
    // Cảnh báo thời tiết
    // ==========================
    let notice = [];
    if (weather.main.temp > 35) notice.push("⚠️ Nắng nóng gay gắt, hạn chế ra ngoài buổi trưa!");
    if (weather.main.temp < 18) notice.push("🧥 Trời lạnh, nhớ mặc ấm khi ra ngoài.");
    if (weather.weather[0].main.toLowerCase().includes("rain")) notice.push("☔ Trời có mưa, hãy mang theo ô.");
    if (weather.wind.speed > 10) notice.push("💨 Gió mạnh, cẩn thận khi đi đường.");
    if (notice.length === 0) notice.push("✅ Không có cảnh báo đặc biệt.");

    // ==========================
    // Tạo Embed đẹp mắt
    // ==========================
    const embed = new EmbedBuilder()
      .setColor(0x1d82b6)
      .setTitle(`🌤️ Dự báo thời tiết tại ${weather.name}, ${weather.sys.country}`)
      .setDescription(`**${weather.weather[0].description}**`)
      .addFields(
        {
          name: "🌡️ Nhiệt độ",
          value: `\`\`\`${weather.main.temp.toFixed(1)}°C (cảm giác: ${weather.main.feels_like.toFixed(1)}°C)\`\`\``,
          inline: true,
        },
        {
          name: "🌡️ Min/Max",
          value: `\`\`\`${weather.main.temp_min.toFixed(1)}°C / ${weather.main.temp_max.toFixed(1)}°C\`\`\``,
          inline: true,
        },
        {
          name: "💧 Độ ẩm",
          value: `\`\`\`${weather.main.humidity}%\`\`\``,
          inline: true,
        },
        {
          name: "🌬️ Gió",
          value: `\`\`\`${weather.wind.speed.toFixed(1)} m/s (${windDir})\`\`\``,
          inline: true,
        },
        {
          name: "📉 Áp suất",
          value: `\`\`\`${weather.main.pressure} hPa\`\`\``,
          inline: true,
        },
        {
          name: "👀 Tầm nhìn",
          value: weather.visibility
            ? `\`\`\`${(weather.visibility / 1000).toFixed(1)} km\`\`\``
            : "Không rõ",
          inline: true,
        },
        {
          name: "🌅 Bình minh",
          value: `\`\`\`${sunrise}\`\`\``,
          inline: true,
        },
        {
          name: "🌇 Hoàng hôn",
          value: `\`\`\`${sunset}\`\`\``,
          inline: true,
        },
        {
          name: "ℹ️ Thông báo",
          value: `\`\`\`${notice.join("\n")}\`\`\``,
        }
      )
      .setTimestamp();

    // ==========================
    // Gửi thông tin lên kênh
    // ==========================
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error(`❌ Không tìm thấy kênh với ID: ${channelId}`);
      return;
    }

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("❌ Weather error:", err.message || err);
  }
}

// ==========================
// Xuất module
// ==========================
module.exports = { sendWeatherUpdate };
