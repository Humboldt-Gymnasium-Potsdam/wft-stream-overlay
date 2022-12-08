import http from "http";
import fs from "fs";
import OBSWebSocket from "obs-websocket-js";

const obs = new OBSWebSocket();

const host = 'localhost';
const port = 8000;

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


await obs.connect('ws://localhost:4455');

const result = await obs.call("GetSceneItemList", {sceneName: "OverlayScene"});

const timerSource = result.sceneItems.find(source => source.sourceName === "Timer");
const scoreSource = result.sceneItems.find(source => source.sourceName === "Score");

const leftTeamSource = result.sceneItems.find(source => source.sourceName === "Team1");
const rightTeamSource = result.sceneItems.find(source => source.sourceName === "Team2");

const requestListener = function (req, res) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(`{"message": "This is a JSON response"}`);
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

// Overlay Management
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

function hintNextMatch() {
    // Update Overlay
}

function showGamePreview() {

}

// Timer Management
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

// DB Management
function fetchMatches() {
    return JSON.parse(fs.readFileSync("matches.json")).matches;
}

function setMatch(matchTitle, home, away) {
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

function makeNextMatch(matchIndex) {
    
}

runTimer();
//setMatch("Achtelfinaleee", "Bananenplantage", "Cocoa gr333n");