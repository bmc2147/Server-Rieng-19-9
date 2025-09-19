const fs = require("fs");
const path = require("path");

const usersFile = path.join(__dirname, "../users.json");

// Load user data
function loadUsers() {
    if (!fs.existsSync(usersFile)) return {};
    return JSON.parse(fs.readFileSync(usersFile, "utf8"));
}

// Save user data
function saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Ensure user exists
function ensureUser(userId) {
    const users = loadUsers();
    if (!users[userId]) {
        users[userId] = {
            coins: 0,
            xp: 0,
            level: 1,
            wins: 0,
            losses: 0,
            earnings: 0,
            lastDaily: null
        };
        saveUsers(users);
    }
    return users[userId];
}

// Add coins
function addCoins(userId, amount) {
    const users = loadUsers();
    const user = ensureUser(userId);

    user.coins += amount;
    user.earnings += Math.max(0, amount); // chỉ cộng earnings khi amount dương
    saveUsers(users);

    return user.coins;
}

// Remove coins
function removeCoins(userId, amount) {
    const users = loadUsers();
    const user = ensureUser(userId);

    if (user.coins < amount) return false;
    user.coins -= amount;
    saveUsers(users);

    return true;
}

// Update wins/losses
function recordGame(userId, result) {
    const users = loadUsers();
    const user = ensureUser(userId);

    if (result === "win") user.wins += 1;
    else if (result === "loss") user.losses += 1;

    saveUsers(users);
    return { wins: user.wins, losses: user.losses };
}

// XP & Level system
function addXP(userId, amount) {
    const users = loadUsers();
    const user = ensureUser(userId);

    user.xp += amount;

    // Level up every 100 XP
    const levelThreshold = user.level * 100;
    if (user.xp >= levelThreshold) {
        user.level += 1;
        user.xp = 0;
    }

    saveUsers(users);
    return { level: user.level, xp: user.xp };
}

// Daily reward
function setLastDaily(userId) {
    const users = loadUsers();
    const user = ensureUser(userId);

    user.lastDaily = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    saveUsers(users);
}

function getLastDaily(userId) {
    const users = loadUsers();
    const user = ensureUser(userId);

    return user.lastDaily;
}

module.exports = {
    addCoins,
    removeCoins,
    getBalance: (id) => ensureUser(id).coins,
    recordGame,
    addXP,
    setLastDaily,
    getLastDaily
};
