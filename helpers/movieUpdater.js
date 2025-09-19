const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

// === Lấy phim trending từ TMDB ===
async function getTrendingMovies() {
  const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}&language=vi-VN`;

  try {
    const res = await fetch(url, { timeout: 15000 });

    if (!res.ok) {
      console.error(`❌ TMDB HTTP error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.results) return [];

    // Lấy top 3 phim trending
    return data.results.slice(0, 3).map(movie => {
      const buyTicketUrl = `https://www.google.com/search?q=mua+vé+"${encodeURIComponent(movie.title)}"+CGV`;

      return {
        title: movie.title,
        overview: movie.overview || "Không có mô tả",
        releaseDate: movie.release_date || "Chưa rõ",
        rating: movie.vote_average ? movie.vote_average.toFixed(1) : "N/A",
        poster: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : null,
        url: `https://www.themoviedb.org/movie/${movie.id}`,
        ticketUrl: buyTicketUrl
      };
    });
  } catch (err) {
    console.error("❌ Lỗi lấy TMDB:", err.message);
    return [];
  }
}

// === Gửi phim trending lên Discord ===
async function sendMovieUpdate(client, channelId) {
  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      console.error(`❌ Không tìm thấy channel ID: ${channelId}`);
      return;
    }

    const movies = await getTrendingMovies();
    if (movies.length === 0) {
      await channel.send("🎬 Hiện không có phim trending.");
      return;
    }

    // === Embed hiển thị phim ===
    const embed = new EmbedBuilder()
      .setColor(0xff4444)
      .setTitle("🎬 Top 3 phim đang hot tuần này")
      .setDescription("Dữ liệu từ [The Movie Database](https://www.themoviedb.org/)")
      .setTimestamp()
      .setFooter({ text: "Cập nhật phim mới nhất" });

    // Thêm thông tin từng phim vào embed
    for (const movie of movies) {
      embed.addFields({
        name: `🎞️ ${movie.title} (⭐ ${movie.rating})`,
        value: [
          `📅 **Phát hành:** ${movie.releaseDate}`,
          `📝 **Mô tả:** ${movie.overview.length > 200 ? movie.overview.slice(0, 200) + "..." : movie.overview}`,
          `🔗 [Chi tiết](${movie.url}) | 🎟️ [Mua vé](${movie.ticketUrl})`,
          movie.poster ? `🖼️ [Poster](${movie.poster})` : ""
        ].join("\n"),
      });
    }

    // Nếu có poster phim đầu tiên thì hiển thị trong embed
    if (movies[0]?.poster) {
      embed.setImage(movies[0].poster);
    }

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("❌ Lỗi khi gửi update phim:", err.message);
  }
}

module.exports = { sendMovieUpdate };
