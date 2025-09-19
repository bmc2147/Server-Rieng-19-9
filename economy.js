const fs = require("fs");

const USERS_FILE = "./users.json";

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getCoins(userId) {
    const users = loadUsers();
    if (!users[userId]) users[userId] = { coins: 1000 };
    saveUsers(users);
    return users[userId].coins;
}

function updateCoins(userId, amount) {
    const users = loadUsers();
    if (!users[userId]) users[userId] = { coins: 1000 };
    users[userId].coins += amount;
    if (users[userId].coins < 0) users[userId].coins = 0;
    saveUsers(users);
}

module.exports = { getCoins, updateCoins };
