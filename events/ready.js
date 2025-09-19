// events/ready.js
const axios = require("axios");
require("dotenv").config();
console.log("🔑 Weather API Key:", process.env.WEATHER_API_KEY ? "Loaded" : "Not found");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {

        // Hàm lấy thời tiết
        async function getWeather() {
            try {
                const apiKey = process.env.WEATHER_API_KEY;
                const city = "Hanoi"; // bạn có thể đổi tên thành phố
                const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=vi`;

                const response = await axios.get(url);
                const data = response.data;

                return `🌤️ ${data.name}: ${data.weather[0].description}, ${data.main.temp}°C`;
            } catch (error) {
                console.error("❌ Không lấy được dữ liệu thời tiết:", error.message);
                return "Không thể lấy thông tin thời tiết.";
            }
        }

        // Các status xoay vòng
        const statuses = [
            { name: "PUBG BATTLEGROUNDS 🎮", type: 0 },
            { name: "Cô Gái Năm Ấy 🎵", type: 2 },
            { name: "YouTube 📺", type: 3 },
            { name: "Bi-a 🎱", type: 5 },
            { name: "Giải Đấu Billiards 🚀", type: 1, url: "https://www.youtube.com/watch?v=Fydm7wCXGUs" }
        ];

        let i = 0;
        setInterval(async () => {
            let status;
            if (i === statuses.length) {
                // Lấy thời tiết khi đến vòng cuối
                const weather = await getWeather();
                status = { name: weather, type: 3 }; // Watching weather
            } else {
                status = statuses[i];
            }

            client.user.setPresence({
                activities: [status],
                status: "online"
            });

            i = (i + 1) % (statuses.length + 1); // +1 cho thời tiết
        }, 5000); // đổi status sau 15 giây
    },
};
