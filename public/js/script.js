function getUrl(path) {
    return "http://localhost:8000" + path;
}

const get = async (path) => {
    return fetch(getUrl(path), {
        method: "GET",
        mode: "no-cors",
        headers: {
            "accept": "application/json",
        },
    });
}

const post = async (path, body)  => {
    return fetch(getUrl(path), {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "accept": "application/json",
            "content-type": "application/json"
        },
        mode: "no-cors",
    });
}

const getMatches = async () => {
    let response = await get("/api/matches");
    return await response.json();
}

/*
  timer {String} (MM:SS)
*/
async function setTimer(timer) {
    let response = await post("/api/setTimer", {
        timer: timer
    });

    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to set timer!")
        return false;
    }

    console.log("Set timer!")
    return true;
}

/* Currently, not in use
const getTimer = async () => {
    let response = await get("/api/getTimer");

    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to get timer!");
        return "";
    }

    const timerData = await response.json();
    return timerData.timer;
}; */

const setNextMatch = async (matchId) => {
    let response = await post("/api/setNextMatch", {
        matchId: matchId
    });

    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to set next match!")
        return false;
    }
    console.log("Set next match!")
    return true;
}

const deleteMatch = async (matchId) => {
    response = await post("/api/deleteMatch", {
        matchId: matchId
    });
    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to delete match!")
        return false;
    }

    console.log("Deleted match!")
    return true;
}

const updateMatch = async (match) => {
    let response = await post("/api/updateMatch", match);

    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to update match!");
        return false;
    }

    console.log("Updated match!");
    return true;
};

const addMatch = async (match) => {
    letresponse = await post("/api/addMatch", match);

    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to add match!");
        return false;
    }

    console.log("Added match!");
    return true;
};

const resetTimer = async () => {
    document.getElementById("timer-input").value = "06:00";
    await setTimer("06:00");
};

const startMatch = async () => {
    let response = await post("/api/startMatch", {});

    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to start match!");
        return false;
    }

    console.log("Started match!");
    return true;
};

const nextGameAnimation = async() => {
    let response = await post("/api/nextGame", {});

    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to show next game animation!");
        return false;
    }

    console.log("Showing next game animation!");
    return true;
};

const gamePreviewScene = async() => {
    let response = await post("/api/gamePreviewScene", {});

    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to show game preview scene!");
        return false;
    }

    console.log("Showing game preview scene!");
    return true;
};

async function pauseGame() {
    const response = await post("/api/pauseMatch", {});

    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to pause game!");
        return false;
    }

    return true;
}

async function getGameStatus() {
    const response = await get("/api/getMatchStatus");

    if (!response.status.toString().startsWith("2")) {
        return "unknown";
    }

    return await response.text();
}

async function getMatch(matchId) {
    const response = await get("/api/getMatch?id=" + matchId);
    return await response.json();
}

async function getCurrentMatch() {
    const response = await get("/api/getCurrentMatch");
    return await response.json();
}

async function updateCurrentMatch() {
    const matchData = await getCurrentMatch();
    await updateMatchUI(matchData);
}

async function updateMatchUI(matchData) {
    document.querySelector("#home-team-score").innerHTML = JSON.stringify(matchData.homeScore);
    document.querySelector("#home-team-name").innerHTML = matchData.home;

    document.querySelector("#away-team-score").innerHTML = JSON.stringify(matchData.awayScore);
    document.querySelector("#away-team-name").innerHTML = matchData.away;
}

async function updateMatchesTable() {
    const matchesData = await getMatches();

    clearMatchTable();
    fillMatchTable(matchesData);
}

const clearMatchTable = () => {
    let matchesTable = document.getElementById("matches-table").querySelector("tbody");
    matchesTable.innerHTML = "";
}

const fillMatchTable =  (matchesData) => {
    // Table on bottom
    let matchesTable = document.getElementById("matches-table").querySelector("tbody");
    matchesData.matches.forEach((match, index) => {
        let matchElement = document.createElement("tr");
        matchElement.id = index;

        [match.title, match.home, match.away].forEach(team => {
            let matchTeamElement = document.createElement("td");
            let matchTeamInput = document.createElement("input");
            matchTeamInput.type = "text";
            matchTeamInput.value = team;
            matchTeamElement.appendChild(matchTeamInput);
            matchElement.appendChild(matchTeamElement);
        })

        let buttonTableCell = document.createElement("td");
        let updateButton = document.createElement("button");

        updateButton.classList.add("btn", "btn-primary");
        updateButton.style.marginRight = "10px";
        updateButton.innerHTML = "Update";

        updateButton.addEventListener("click", async () => {
            let title = matchElement.querySelectorAll("input")[0].value;
            let home = matchElement.querySelectorAll("input")[1].value;
            let away = matchElement.querySelectorAll("input")[2].value;

            await updateMatch({
                id: index,
                title: title,
                home: home,
                away: away
            });

            await updateCurrentMatch();
        });

        let setNextMatchButton = document.createElement("button");

        setNextMatchButton.innerHTML = "Make next match";
        setNextMatchButton.classList.add("btn", "btn-primary");
        setNextMatchButton.style.marginRight = "10px";
        setNextMatchButton.innerHTML = "Set Next Match";

        setNextMatchButton.addEventListener("click", async () => {
            await setNextMatch(index);
            await updateMatchesTable();
        });

        let deleteMatchButton = document.createElement("button");

        deleteMatchButton.innerHTML = "Delete";
        deleteMatchButton.classList.add("btn", "btn-primary");

        deleteMatchButton.addEventListener("click", async () => {
            await deleteMatch(index);
            await updateMatchesTable();
        });

        buttonTableCell.append(updateButton, setNextMatchButton, deleteMatchButton);
        matchElement.append(buttonTableCell);
        matchesTable.append(matchElement);
    });
}

async function addScore(team) {
    let response = await post("/api/addScore", {
        team: team,
    })

    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to set new score!")
        return false;
    }
}

async function reduceScore(team) {
    let response = await post("/api/reduceScore", {
        team: team,
    })

    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to set new score!")
        return false;
    }
}

async function getScore() {
    let response = await get("/api/getScore");

    if (!response.status.toString().startsWith("2")) {
        console.log("Failed to get score!");
        return false;
    }

    const scoreData = await response.json();

    setHomeScore(scoreData.home);
    setAwayScore(scoreData.away);
}

function setHomeScore(score) {
    document.getElementById("home-team-score").innerHTML = score;
}

function setAwayScore(score) {
    document.getElementById("away-team-score").innerHTML = score;
}

const initPage = () => {
    updateCurrentMatch();
    updateMatchesTable();
    updateGameStatusUI();

    // EXAMPLES
    updateMatchUI({
        home: "Home",
        homeScore: 0,
        away: "Away",
        awayScore: 0
    });
};

async function updateGameStatusUI() {
    document.getElementById("game-status").innerHTML = await getGameStatus();
}

initPage();

/* Game Control Buttons */
document.querySelector("#start-game-button").addEventListener("click", async () => {
    await startMatch();
    await updateGameStatusUI();
});

document.querySelector("#reset-game-button").addEventListener("click", async () => {
    await resetTimer();
    await updateGameStatusUI();
});

document.querySelector("#pause-game-button").addEventListener("click", async () => {
    await pauseGame();
    await updateGameStatusUI();
});

document.querySelector("#next-game-animation-button").addEventListener("click", async () => {
    await nextGameAnimation();
    await updateGameStatusUI();
    await updateCurrentMatch();
});

document.querySelector("#add-new-match-button").addEventListener("click", async () => {
    let title = document.getElementById("match-title-input").value;
    let home = document.querySelector("#match-home-team-input").value;
    let away = document.querySelector("#match-away-team-input").value;

    await addMatch({
        title: title,
        home: home,
        away: away
    });
    await updateMatchesTable();
});

document.querySelector("#timer-submit-button").addEventListener("click", async () => {
    console.log(document.getElementById("timer-input").value)
    await setTimer(document.getElementById("timer-input").value);
});

document.querySelector("#home-goal-minus-button").addEventListener("click", async () => {
    await reduceScore("home");
    await getScore();
});

document.querySelector("#home-goal-add-button").addEventListener("click", async () => {
    await addScore("home");
    await getScore();
});

document.querySelector("#away-goal-minus-button").addEventListener("click", async () => {
    await reduceScore("away");
    await getScore();
});

document.querySelector("#away-goal-add-button").addEventListener("click", async () => {
    await addScore("away");
    await getScore();
});
