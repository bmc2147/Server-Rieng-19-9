const fs = require("fs");
const USERS_FILE = "./users.json";

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getUser(userId) {
    const users = loadUsers();
    if (!users[userId]) {
        users[userId] = { coins: 1000, games: {} }; // games lưu trạng thái các game
        saveUsers(users);
    }
    return users[userId];
}

function updateUser(userId, data) {
    const users = loadUsers();
    users[userId] = { ...getUser(userId), ...data };
    saveUsers(users);
}

function addCoins(userId, amount) {
    const users = loadUsers();
    const user = getUser(userId);
    user.coins += amount;
    users[userId] = user;
    saveUsers(users);
}

function removeCoins(userId, amount) {
    const users = loadUsers();
    const user = getUser(userId);
    if (user.coins >= amount) {
        user.coins -= amount;
        users[userId] = user;
        saveUsers(users);
        return true;
    }
    return false;
}

module.exports = {
    getUser,
    updateUser,
    addCoins,
    removeCoins
};
