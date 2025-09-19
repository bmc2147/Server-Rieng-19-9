const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

/**
 * Format thời gian thành HH:MM (giờ Việt Nam)
 */
function formatTime(date = new Date()) {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

/**
 * Lấy dữ liệu tình hình giao thông từ TomTom API
 */
async function fetchTrafficData(city) {
  const apiKey = process.env.TRAFFIC_API_KEY;
  if (!apiKey) {
    throw new Error("❌ Thiếu TRAFFIC_API_KEY trong file .env");
  }

  // Vị trí mặc định của một số thành phố lớn
  const locationMap = {
    "Hanoi,VN": { lat: 21.0278, lon: 105.8342 },
    "HoChiMinh,VN": { lat: 10.7769, lon: 106.7009 },
    "Danang,VN": { lat: 16.0471, lon: 108.2068 },
  };

  const loc = locationMap[city] || locationMap["Hanoi,VN"];
  const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${apiKey}&point=${loc.lat},${loc.lon}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`❌ API giao thông lỗi: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Hàm đánh giá tình trạng kẹt xe
 */
function getCongestionLevel(currentSpeed, freeFlowSpeed) {
  const ratio = currentSpeed / freeFlowSpeed;
  if (ratio >= 0.8) return "🟢 Lưu thông thông thoáng";
  if (ratio >= 0.6) return "🟡 Lưu thông đông đúc";
  return "🔴 Kẹt xe nặng, di chuyển rất chậm!";
}

/**
 * Gửi thông báo tình hình giao thông lên Discord
 */
async function sendTrafficUpdate(client, channelId) {
  try {
    const city = process.env.TRAFFIC_CITY || "Hanoi,VN";
    const trafficData = await fetchTrafficData(city);

    const flow = trafficData?.flowSegmentData;
    if (!flow) {
      throw new Error("❌ API không trả về dữ liệu giao thông hợp lệ!");
    }

    // ✅ Chỉ log dữ liệu quan trọng, không log toàn bộ coordinates
    const cleanData = {
      frc: flow.frc,
      currentSpeed: flow.currentSpeed,
      freeFlowSpeed: flow.freeFlowSpeed,
      currentTravelTime: flow.currentTravelTime,
      freeFlowTravelTime: flow.freeFlowTravelTime,
      confidence: flow.confidence,
      roadClosure: flow.roadClosure,
    };

    // Xử lý đánh giá kẹt xe
    const congestionLevel = getCongestionLevel(flow.currentSpeed, flow.freeFlowSpeed);

    // Lấy tọa độ đầu tiên để tạo link Google Maps
    const firstCoord = flow.coordinates?.coordinate?.[0];
    const mapsLink = firstCoord
      ? `https://www.google.com/maps?q=${firstCoord.latitude},${firstCoord.longitude}`
      : "https://www.google.com/maps";

    const embed = new EmbedBuilder()
      .setColor(
        flow.currentSpeed / flow.freeFlowSpeed > 0.6 ? 0xf1c40f : 0xe74c3c
      )
      .setTitle(`🚦 Cập nhật tình hình giao thông - ${city}`)
      .setDescription(`📍 [Xem vị trí trên bản đồ](${mapsLink})`)
      .addFields(
        {
          name: "🚗 Tốc độ hiện tại",
          value: `\`\`\`${flow.currentSpeed} km/h\`\`\``,
          inline: true,
        },
        {
          name: "🛣️ Tốc độ lý tưởng",
          value: `\`\`\`${flow.freeFlowSpeed} km/h\`\`\``,
          inline: true,
        },
        {
          name: "📊 Mật độ",
          value: `\`\`\`${(flow.confidence * 100).toFixed(0)}%\`\`\``,
          inline: true,
        },
        {
          name: "⚠️ Đánh giá",
          value: congestionLevel,
        }
      )
      .setFooter({ text: `Cập nhật lúc ${formatTime()}` })
      .setTimestamp();

    // Gửi thông báo đến kênh Discord
    const channel = await client.channels.fetch(channelId);
    if (channel) {
      await channel.send({ embeds: [embed] });
    } else {
      console.error("❌ Không tìm thấy kênh để gửi thông tin giao thông!");
    }
  } catch (err) {
    console.error("❌ Traffic update error:", err.message);
  }
}

module.exports = { sendTrafficUpdate };
