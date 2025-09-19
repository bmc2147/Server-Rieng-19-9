const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("weather")
        .setDescription("Xem thời tiết chi tiết của một thành phố")
        .addStringOption(option =>
            option.setName("city")
                .setDescription("Tên thành phố (vd: Hanoi, Ho Chi Minh)")
                .setRequired(true)
        ),
    async execute(interaction) {
        const city = interaction.options.getString("city").trim();
        const apiKey = process.env.WEATHER_API_KEY;

        if (!apiKey) {
            return interaction.reply({
                content: "⚠️ Bạn chưa cấu hình API key. Hãy thêm `WEATHER_API_KEY` vào `.env`.",
                flags: 64,
            });
        }

        try {
            const res = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=vi`
            );

            const weather = res.data;

            let icon = "🌤️";
            const condition = weather.weather[0].main.toLowerCase();
            if (condition.includes("cloud")) icon = "☁️";
            if (condition.includes("rain")) icon = "🌧️";
            if (condition.includes("storm")) icon = "⛈️";
            if (condition.includes("snow")) icon = "❄️";
            if (condition.includes("clear")) icon = "☀️";
            if (condition.includes("mist") || condition.includes("fog")) icon = "🌫️";

            const sunrise = new Date(weather.sys.sunrise * 1000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
            const sunset = new Date(weather.sys.sunset * 1000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

            const deg = weather.wind.deg ?? 0;
            const directions = ["Bắc", "Đông Bắc", "Đông", "Đông Nam", "Nam", "Tây Nam", "Tây", "Tây Bắc"];
            const windDir = directions[Math.round(deg / 45) % 8];

            const embed = new EmbedBuilder()
                .setTitle(`${icon} Thời tiết tại ${weather.name}`)
                .setDescription(`**${weather.weather[0].description.toUpperCase()}**`)
                .addFields(
                    { name: "🌡️ Nhiệt độ", value: `\`\`\`${weather.main.temp.toFixed(1)}°C (cảm giác: ${weather.main.feels_like.toFixed(1)}°C)\`\`\``, inline: true },
                    { name: "🌡️ Min/Max", value: `\`\`\`${weather.main.temp_min.toFixed(1)}°C / ${weather.main.temp_max.toFixed(1)}°C\`\`\``, inline: true },
                    { name: "💧 Độ ẩm", value: `\`\`\`${weather.main.humidity}%\`\`\``, inline: true },
                    { name: "🌬️ Gió", value: `\`\`\`${weather.wind.speed.toFixed(1)} m/s (${windDir})\`\`\``, inline: true },
                    { name: "📉 Áp suất", value: `\`\`\`${weather.main.pressure} hPa\`\`\``, inline: true },
                    { name: "👀 Tầm nhìn", value: weather.visibility ? `\`\`\`${(weather.visibility / 1000).toFixed(1)} km\`\`\`` : "Không rõ", inline: true },
                    { name: "🌅 Bình minh", value: `\`\`\`${sunrise}\`\`\``, inline: true },
                    { name: "🌇 Hoàng hôn", value: `\`\`\`${sunset}\`\`\``, inline: true }
                )
                .setThumbnail(`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`)
                .setColor("Blue")
                .setFooter({ text: "Nguồn: OpenWeatherMap" })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error(err.response?.data || err.message);
            await interaction.reply({
                content: "❌ Không lấy được dữ liệu thời tiết. Hãy kiểm tra lại tên thành phố hoặc API key!",
                flags: 64
            });
        }
    }
};
