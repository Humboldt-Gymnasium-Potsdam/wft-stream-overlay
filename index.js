import http from "http";
import fs from "fs";
import OBSWebSocket from "obs-websocket-js";

const obs = new OBSWebSocket();

const host = 'localhost';
const port = 8000;

// Overlay variables
let startTimerMinutes = 6;
let startTimerSeconds = 0;

let currentGameIndex = 0;

let matchesData = [["", "", ""]];

let leftScore = 0;
let rightScore = 0;

let timerMinutes = 0;
let timerSeconds = 0;

let timerResetted = false;
let timerPaused = false;
let timerEnded = false;
let isRunning = false;

// UI variables
let indexFile;

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

const requestListener = function (req, res) {
    switch (req.url) {
        case "/" || "":
            res.setHeader("Content-Type", "text/html");
            res.writeHead(200);
            res.end(indexFile);
            break;
        
        case "/api/nextGame":
            break;

        case "/api/startGame":
            break;

        case "/api/addMatch":
            break;

        case "/api/updateMatch":
            break;
        
        case "/api/deleteMatch":
            break;

        case "/api/setNextMatch":
            break;

        case "/api/setTimer":
            break;

        case "/api/matches":
            break;

        case "/api/gamePreviewScene":
            break;
        
        case "/api/getMatchStatus":  // Paused? Ended?
            break;

        case "/api/pauseMatch":  // Pause and continue
            break;
        
        case "/api/setScore":
            break;
        
        case "/api/getScore":
            break;
    }
};
const server = http.createServer(requestListener);
fs.readFile("index.html", contents => {
    indexFile = contents;
    
    server.listen(port, host, () => {
        console.log(`Server is running on http://${host}:${port}`);
    });
});


// ----------------------
// - Overlay Management -
// ----------------------

async function increaseLeftScore() {
    leftScore++;

    // Update Overlay
    await obs.call("SetInputSettings", {inputName: scoreSource.sourceName, inputSettings: {text: leftScore + " : " + rightScore}});
}

async function increaseRightScore() {
    rightScore++;
    
    // Update Overlay
    await obs.call("SetInputSettings", {inputName: scoreSource.sourceName, inputSettings: {text: leftScore + " : " + rightScore}});
}

async function decreaseLeftScore() {
    if (leftScore == 0) {
        return;
    }

    leftScore--;

    // Update Overlay
    await obs.call("SetInputSettings", {inputName: scoreSource.sourceName, inputSettings: {text: leftScore + " : " + rightScore}});
}

async function decreaseRightScore() {
    if (rightScore == 0) {
        return;
    }

    rightScore--;

    // Update Overlay
    await obs.call("SetInputSettings", {inputName: scoreSource.sourceName, inputSettings: {text: leftScore + " : " + rightScore}});
}

async function setCurrentTeams(teamData) {
    teamInformation = teamData;

    // Update Overlay
    await obs.call("SetInputSettings", {inputName: leftTeamSource.sourceName, inputSettings: {text: teamInformation[1]}});
    await obs.call("SetInputSettings", {inputName: rightTeamSource.sourceName, inputSettings: {text: teamInformation[2]}});
}

async function hintNextMatch() {
    // Update Overlay
    let nextMatchData = matchesData[currentGameIndex + 1];
}

async function nextGame() {
    currentGameIndex++;
    await loadGameData(currentGameIndex);
}

async function loadGameData(matchIndex) {
    const matchInformation = matchesData[matchIndex];

    // Update Overlay
    await obs.call("SetInputSettings", {inputName: leftTeamSource.sourceName, inputSettings: {text: matchInformation.home}});
    await obs.call("SetInputSettings", {inputName: rightTeamSource.sourceName, inputSettings: {text: matchInformation.away}});

    // Update Preview
    await obs.call("SetInputSettings", {inputName: gameType.sourceName, inputSettings: {text: matchInformation.title}});

    await obs.call("SetInputSettings", {inputName: leftTeamPreview.sourceName, inputSettings: {text: matchInformation.home}});
    await obs.call("SetInputSettings", {inputName: rightTeamPreview.sourceName, inputSettings: {text: matchInformation.away}});
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
    timerMinutes = startTimerMinutes;
    timerSeconds = startTimerSeconds;

    // Update Overlay
    let seconds = timerSeconds;

    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    await obs.call("SetInputSettings", {inputName: timerSource.sourceName, inputSettings: {text: timerMinutes + ":" + seconds}});
}

async function runTimer() {
    isRunning = true;
    resetTimer();

    while (!timerResetted || !timerEnded) {
        await new Promise(resolve => setTimeout(resolve, 1_000));

        while (timerPaused) {
            setTimeout(function() { }, 500);
        }
        console.log(timerMinutes + ":" + timerSeconds);

        // Check if no minute is over
        if (timerSeconds != 0) {
            timerSeconds--;
            setTime();

            continue;
        }

        // Check if the time is not over
        if (timerMinutes != 0) {
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
    await obs.call("SetInputSettings", {inputName: timerSource.sourceName, inputSettings: {text: timerMinutes + ":" + seconds}});
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

function addMatch(matchTitle, home, away) {
    matchesData.push([ matchTitle, home, away ]);
    
    syncJsonData();
}

function syncJsonData() {
    fs.writeFile('matches.json', { matches: matchesData }, err => {
        if (err) {
            console.log("Error occurred while trying to write json data to file!");
            return false;
        }

        return true;
    });
}


matchesData = fetchMatches();
loadGameData(0);
runTimer();
nextGame();
nextGame();
increaseLeftScore();
//setMatch("Achtelfinaleee", "Bananenplantage", "Cocoa gr333n");
