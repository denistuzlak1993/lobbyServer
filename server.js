// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 5000;


// Debug info
console.log("Script is running...");

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// File paths
const hostsFile = 'hosts.json';
const racesFile = 'races.json';
const leaderboardFile = 'leaderboard.json';

// Init files if not exist
if (!fs.existsSync(hostsFile)) fs.writeFileSync(hostsFile, JSON.stringify([]));
if (!fs.existsSync(racesFile)) fs.writeFileSync(racesFile, JSON.stringify([]));
if (!fs.existsSync(leaderboardFile)) fs.writeFileSync(leaderboardFile, JSON.stringify([]));

function loadHosts() {
    return JSON.parse(fs.readFileSync(hostsFile));
}

function saveHosts(data) {
    fs.writeFileSync(hostsFile, JSON.stringify(data, null, 2));
}

function loadRaces() {
    return JSON.parse(fs.readFileSync(racesFile));
}

function saveRaces(data) {
    fs.writeFileSync(racesFile, JSON.stringify(data, null, 2));
}

function loadLeaderboard() {
    return JSON.parse(fs.readFileSync(leaderboardFile));
}

function saveLeaderboard(data) {
    fs.writeFileSync(leaderboardFile, JSON.stringify(data, null, 2));
}

// Register new host or update existing
app.post('/registerHost/', (req, res) => {
    const { driver_name, ip_address, game_version, locked, player_count } = req.body;

    if (game_version !== '300') {
        return res.status(403).send('Version mismatch');
    }

    let hosts = loadHosts();
    let found = hosts.find(h => h.ip_address === ip_address);

    if (found) {
        found.driver_name = driver_name;
        found.locked = !!locked;
        found.player_count = parseInt(player_count) || 1;
    } else {
        hosts.push({
            driver_name,
            ip_address,
            port: 8765,
            locked: !!locked,
            player_count: parseInt(player_count) || 1
        });
    }

    saveHosts(hosts);
    res.send({ success: true });
});

// Unregister host
app.post('/unregisterHost/', (req, res) => {
    const { ip_address } = req.body;
    let hosts = loadHosts().filter(h => h.ip_address !== ip_address);
    saveHosts(hosts);
    res.send({ success: true });
});

// Get all hosts
app.get('/getHosts/', (req, res) => {
    const hosts = loadHosts();
    res.send({ hosts });
});

// Get active races
app.get('/getRaces/', (req, res) => {
    const races = loadRaces();
    res.send({ races });
});

// Fake add race manually (for testing)
app.post('/addRace/', (req, res) => {
    const { driver_name, player_count } = req.body;
    let races = loadRaces();
    races.push({ driver_name, player_count: parseInt(player_count) || 2 });
    saveRaces(races);
    res.send({ success: true });
});

app.post('/submitRecord/', (req, res) => {
    const { driver_name, timing, track, layout, condition, car } = req.body;

    if (!driver_name || timing == null || track == null || layout == null || condition == null || car == null) {
        return res.status(400).send({ error: 'Missing required fields' });
    }

    let records = loadLeaderboard();

    const id = Date.now().toString(); // Jednostavan ID (može se kasnije zamijeniti UUID-om)
    records.push({
        id,
        driver_name,
        timing: parseFloat(timing),
        track: parseInt(track),
        layout: parseInt(layout),
        condition: parseInt(condition),
        car: parseInt(car)
    });

    // Sortiraj po vremenu (manje je bolje)
    records.sort((a, b) => a.timing - b.timing);

    saveLeaderboard(records);
    res.send({ success: true, id });
});
// Start server
app.listen(PORT, () => {
    console.log(`Lobby server listening on http://localhost:${PORT}`);
});

// Debug: catch unhandled errors
process.on('uncaughtException', function (err) {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', function (reason, promise) {
    console.error('Unhandled Rejection:', reason);
});

app.get('/', (req, res) => {
  res.send('Lobby Server is running!');
});
app.get('/getRecords/', (req, res) => {
    const { track, layout, condition, car } = req.query;

    if (track == null || layout == null || condition == null || car == null) {
        return res.status(400).send({ error: 'Missing query parameters' });
    }

    let records = loadLeaderboard();

    // Filtriraj po traženim kriterijima
    let filtered = records.filter(r =>
        r.track == track &&
        r.layout == layout &&
        r.condition == condition &&
        r.car == car
    );

    res.send({ records: filtered });
});
app.listen(PORT, () => {
    console.log(`Lobby server listening on http://localhost:${PORT}`);
});