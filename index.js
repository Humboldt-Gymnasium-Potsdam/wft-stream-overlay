import express, { application } from "express";
import helmet from "helmet";
import compression from "compression";
import bodyParser from "body-parser";
import http from "http";
import { resolve } from "path";
import fs from "fs";
import OBSWebSocket from "obs-websocket-js";

const obs = new OBSWebSocket();

// Overlay variables
let startTimerMinutes = 6;
let startTimerSeconds = 0;

let currentGameIndex = 0;

let matchesData = [];

let leftScore = 0;
let rightScore = 0;

let timerMinutes = 0;
let timerSeconds = 0;

let timerReset = false;
let timerPaused = false;
let timerEnded = false;
let isRunning = false;

// UI variables
await obs.connect('ws://localhost:4455');

const overlayScene = await obs.call("GetSceneItemList", {sceneName: "OverlayScene"});
const previewScene = await obs.call("GetSceneItemList", {sceneName: "Preview"});

const timerSource = overlayScene.sceneItems.find(source => source.sourceName === "Timer");
const scoreSource = overlayScene.sceneItems.find(source => source.sourceName === "Score");

const leftTeamSource = overlayScene.sceneItems.find(source => source.sourceName === "Team1");
const rightTeamSource = overlayScene.sceneItems.find(source => source.sourceName === "Team2");

const leftTeamPreview = previewScene.sceneItems.find(source => source.sourceName === "NextTeam1");
const rightTeamPreview = previewScene.sceneItems.find(source => source.sourceName === "NextTeam2");
const gameType = previewScene.sceneItems.find(source => source.sourceName === "Gametype");

// Http-Server
const __dirname = resolve();

const app = express();
const httpServer = http.createServer(app);
const port = 8000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(compression());
app.use(helmet());
app.use("/static", express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Api Calls

app.get("/" || "", function (req, res) {
    console.log("rooot")
    res.sendFile("html/index.html", {root: __dirname});
});

app.get("/api/matches", function (req, res) {
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ matches: matchesData }));
});

// Timer api-calls
app.post("/api/setTimer", function (req, res) {
    req.on("data", data => {
        try {
            const json = JSON.parse(data.toString());
            
            startTimerMinutes = parseInt(json.timer.split(":")[0]);
            startTimerSeconds = parseInt(json.timer.split(":")[1]);

            resetTimer();
        }

        catch {
            res.status(400).end();
            return;
        }
        
        res.status(200).end();
    });
});

app.get("/api/getTimer", function (req, res) {
    let seconds = timerSeconds.toString();

    if (timerSeconds === 0) {
        seconds = "00";
    }

    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ timer: `${timerMinutes}:${seconds}` }));
});

// Match api-calls
app.post("/api/setNextMatch", function (req, res) {
    req.on("data", data => {
        try {
            const json = JSON.parse(data.toString());
            
            setNextMatch(json.matchId);
        }

        catch {
            res.status(400).end();
            return;
        }
        
        res.status(200).end();
    });
});

app.post("/api/deleteMatch", function (req, res) {
    req.on("data", data => {
        try {
            const json = JSON.parse(data.toString());
            
            removeMatch(json.matchId);
        }

        catch {
            res.status(400).end();
            return;
        }
        
        res.status(200).end();
    });
});

app.post("/api/updateMatch", function (req, res) {
    req.on("data", data => {
        try {
            const match = JSON.parse(data.toString());
            
            editMatch(match.id, match.title, match.home, match.away);
        }

        catch {
            res.status(400).end();
            return;
        }
        
        res.status(200).end();
    });
});

app.post("/api/addMatch", function (req, res) {
    req.on("data", data => {
        try {
            const match = JSON.parse(data.toString());
        
            addMatch(match.title, match.home, match.away);
        }

        catch {
            res.status(400).end();
            return;
        }
        
        res.status(200).end();
    });
});

app.post("/api/startMatch", function (req, res) {
    startTimer();
    res.status(200).end();
});

app.post("/api/nextGame", function (req, res) {
    nextGame();
    res.status(200).end();
});

// (GamePreview not included anymore)

app.post("/api/pauseMatch", function (req, res) {
    pauseTimer();
    res.status(200).end();
});

app.get("/api/getMatchStatus", function (req, res) {
    let gameStatus = "Unknown";
    if (timerPaused)
        gameStatus = "Game Paused";

    else if (timerEnded)
        gameStatus = "Game Ended";

    else if (timerReset)
        gameStatus = "Game Ready";
    
    else if (isRunning) 
        gameStatus = "Game Running";
    
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end(gameStatus);
});

app.get("/api/getMatch", function (req, res) {
    console.log(req.params);
    console.log(req.body);
    res.status(200);
    res.end();
});

app.get("/api/getCurrentMatch", function (req, res) {
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ 
        id: currentGameIndex,
        home: matchesData[currentGameIndex].home, 
        away: matchesData[currentGameIndex].away, 
        homeScore: leftScore, 
        awayScore: rightScore 
    }));
});

// Score api-calls
app.post("/api/addScore", function (req, res) {
    req.on("data", data => {
        try {
            const json = JSON.parse(data.toString());
            if (json.team === "home") {
                increaseLeftScore();
            }

            else if (json.team === "away") {
                increaseRightScore();
            }
        }

        catch {
            res.status(400).end();
            return;
        }
        
        res.status(200).end();
    });
});

app.post("/api/reduceScore", function (req, res) {
    req.on("data", data => {
        try {
            const json = JSON.parse(data.toString());
            if (json.team === "home") {
                decreaseLeftScore();
            }

            else if (json.team === "away") {
                decreaseRightScore();
            }
        }

        catch {
            res.status(400).end();
            return;
        }
        
        res.status(200).end();
    });
});

app.get("/api/getScore", function (req, res) {
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ home: leftScore, away: rightScore }));
});

httpServer.listen(port, async () => {
    matchesData = await fetchMatches();
    await loadGameData(currentGameIndex);
    console.info("Listening on http://localhost:" + port);
});

// ----------------------
// - Overlay Management -
// ----------------------

async function increaseLeftScore() {
    leftScore++;

    // Update Overlay
    await obs.call("SetInputSettings", {inputName: scoreSource.sourceName,
        inputSettings: {text: leftScore + " : " + rightScore}});
}

async function increaseRightScore() {
    rightScore++;
    
    // Update Overlay
    await obs.call("SetInputSettings", {inputName: scoreSource.sourceName,
        inputSettings: {text: leftScore + " : " + rightScore}});
}

async function decreaseLeftScore() {
    if (leftScore === 0) {
        return;
    }

    leftScore--;

    // Update Overlay
    await obs.call("SetInputSettings", {inputName: scoreSource.sourceName,
        inputSettings: {text: leftScore + " : " + rightScore}});
}

async function decreaseRightScore() {
    if (rightScore === 0) {
        return;
    }

    rightScore--;

    // Update Overlay
    await obs.call("SetInputSettings", {inputName: scoreSource.sourceName,
        inputSettings: {text: leftScore + " : " + rightScore}});
}

async function setCurrentTeams(teamData) {
    // Update Overlay
    await obs.call("SetInputSettings", {inputName: leftTeamSource.sourceName,
        inputSettings: {text: teamData[1]}});
    await obs.call("SetInputSettings", {inputName: rightTeamSource.sourceName,
        inputSettings: {text: teamData[2]}});
}

async function hintNextMatch() {
    // Update Overlay
    let nextMatchData = matchesData[currentGameIndex + 1];
}

async function nextGame() {
    if (matchesData.length <= currentGameIndex + 1) {
        return;
    }
    
    currentGameIndex++;
    await loadGameData(currentGameIndex);
}

async function loadGameData(matchIndex) {
    const matchInformation = matchesData[matchIndex];

    // Update Overlay
    await obs.call("SetInputSettings", {inputName: leftTeamSource.sourceName,
        inputSettings: {text: matchInformation.home}});
    await obs.call("SetInputSettings", {inputName: rightTeamSource.sourceName,
        inputSettings: {text: matchInformation.away}});

    // Update Preview
    await obs.call("SetInputSettings", {inputName: gameType.sourceName,
        inputSettings: {text: matchInformation.title}});

    await obs.call("SetInputSettings", {inputName: leftTeamPreview.sourceName,
        inputSettings: {text: matchInformation.home}});
    await obs.call("SetInputSettings", {inputName: rightTeamPreview.sourceName,
        inputSettings: {text: matchInformation.away}});
}

// --------------------
// - Timer Management -
// --------------------

function startTimer() {
    // Starts the timer or continues it at current point
    if (isRunning) {
        timerPaused = false;
        return;
    }

    runTimer();
} 

function pauseTimer() {
    timerPaused = true;
}

async function resetTimer() {
    timerPaused = false;
    timerReset = true;
    timerEnded = false;
    isRunning = false;

    timerMinutes = startTimerMinutes;
    timerSeconds = startTimerSeconds;

    // Update Overlay
    let seconds = timerSeconds;

    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    await obs.call("SetInputSettings", {inputName: timerSource.sourceName,
        inputSettings: {text: timerMinutes + ":" + seconds}});
}

async function runTimer() {
    resetTimer();

    isRunning = true;
    timerReset = false;

    while (true) {
        if (timerReset || timerEnded)
            break;

        await new Promise(resolve => setTimeout(resolve, 1_000));

        while (timerPaused) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        // console.log(timerMinutes + ":" + timerSeconds);

        // Check if no minute is over
        if (timerSeconds !== 0) {
            timerSeconds--;
            setTime();

            continue;
        }

        // Check if the time is not over
        if (timerMinutes !== 0) {
            timerMinutes--;
            timerSeconds = 59;
            setTime();

            continue;
        }

        // Time is over
        timerEnded = true;
        isRunning = false;

        makeStopNoise();
        
        return;
    }

    resetTimer();
}

async function setTime() {
    let seconds = timerSeconds;

    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    // Update Overlay
    await obs.call("SetInputSettings", {inputName: timerSource.sourceName,
        inputSettings: {text: timerMinutes + ":" + seconds}});
}

function makeStopNoise() {
    // Start stop-sound
}

// -----------------
// - DB Management -
// -----------------
function fetchMatches() {
    return JSON.parse(fs.readFileSync("matches.json")).matches;
}

function addMatch(title, home, away) {
    matchesData.push({
        title: title,
        home: home,
        away: away
    });
    
    syncJsonData();
}

function removeMatch(matchId) {
    if (currentGameIndex > matchId)
        currentGameIndex--;

    matchesData.splice(matchId, 1)[0];

    syncJsonData();
}

function setNextMatch(matchId) {
    if (currentGameIndex > matchId)
        currentGameIndex--;
    
    if (currentGameIndex + 1 >= matchesData.length) {
        let k = currentGameIndex + 1 - matchesData.length + 1;
        while (k--) {
            matchesData.push(undefined);
        }
    }

    matchesData.splice(currentGameIndex + 1, 0, matchesData.splice(matchId, 1)[0]);
    
    syncJsonData();
}

function editMatch(matchId, title, home, away) {
    matchesData[matchId] = {
        title: title,
        home: home,
        away: away
    };

    syncJsonData();
    loadGameData(currentGameIndex);
}

function syncJsonData() {
    fs.writeFile('matches.json', JSON.stringify({ matches: matchesData }), err => {
        if (err) {
            console.log("Error occurred while trying to write json data to file!");
            return false;
        }

        return true;
    });
}
