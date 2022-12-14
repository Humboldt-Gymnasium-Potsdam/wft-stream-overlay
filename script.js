
function getUrl(path) {
    api_url = "http://127.0.0.1:5000";
    return api_url + path;
}

const get = async (path) => {
    return fetch(getUrl(path), {
        method: "GET",
        headers: {
            "accept": "application/json",
        },
    });
}


const post = async (path, body)  =>{
    return fetch(getUrl(path), {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "accept": "application/json",
            "content-type": "application/json"
        }
    });
}

const delete1 = async (path, body)  => {
    return fetch(getUrl(path), {
        method: "DELETE",
        body: JSON.stringify(body),
        headers: {
            "accept": "application/json",
            "content-type": "application/json"
        }
    });
}

const getMatches = async () => {
    response = await get("/api/matches");
    matches = await response.json();
    return matches;
}


/*
  timer {String} (MM:SS)
*/
async function setTimer(timer) {
    response = await post("/api/setTimer", {
        timer: timer
    });
    if (response.status !== 204) {
        console.log("Failed to set timer!")
        return false;
    }
    console.log("Set timer!")
    return true;
}

const getTimer = async () => {
    response = await get("/api/getTimer");
    if (response.status !== 200) {
        console.log("Failed to get timer!");
        return "";
    }
    const timerData = await response.json();
    return timerData.timer;
};

const setNextMatch = async (matchId) => {
    response = await post("/api/setNextMatch", {
        matchId: matchId
    });
    if (response.status !== 201) {
        console.log("Failed to set next match!")
        return false;
    }
    console.log("Set next match!")
    await updateMatchesTable();
    return true;
}

const deleteMatch = async (matchId) => {
    response = await delete1("/api/deleteMatch", {
        matchId: matchId
    });
    if (response.status !== 201) {
        console.log("Failed to delete match!")
        return false;
    }
    console.log("Deleted match!")
    await updateMatchesTable();
    return true;
}

const updateMatch = async (match) => {
    response = await post("/api/updateMatch", JSON.stringify(match));
    if (response.status !== 204) {
        console.log("Failed to update match!")
        return false;
    }
    console.log("Updated match!")
    await updateMatchesTable();
    return true;
};

const addMatch = async (match) => {
    response = await post("/api/addMatch", JSON.stringify(match));
    if (response.status !== 201) {
        console.log("Failed to add match!")
        return false;
    }
    console.log("Added match!")
    await updateMatchesTable();
    return true;
};

const resetTimer = async () => {
    document.getElementById("timer-input").value = "06:00";
    await setTimer("06:00");
};
const startMatch = async () => {
    response = await post("/api/startMatch", {});
    if (response.status !== 204) {
        console.log("Failed to start match!")
        return false;
    }
    console.log("Started match!")
    return true;
};

const nextGameAnimation = async() => {
    response = await post("/api/nextGame", {});
    if (response.status !== 201) {
        console.log("Failed to show next game animation!")
        return false;
    }
    console.log("Showing next game animation!")
    return true;
};

const gamePreviewScene = async() => {
    response = await post("/api/gamePreviewScene", {});
    if (response.status !== 201) {
        console.log("Failed to show game preview scene!")
        return false;
    }
    console.log("Showing game preview scene!")
    return true;
};

async function pauseGame() {
    const response = await post("/api/pauseMatch", {});
    if (response.status !== 204) {
        console.log("Failed to pause game!");
        return false;
    }

    const result = await response.json();
    if (result.success) {
        console.log("Paused game!");
        return true;
    }
    console.log("Failed to pause game!");
    return false;
}

async function getGameStatus() {
    const response = await get("/api/getMatchStatus");
    if (response.status !== 200) {
        return "unknown";
    }

    return await response.text();;
}


const updateTimer = async () => {
    document.getElementById("timer").innerHTML = await getTimer();
};

async function getMatch(matchId) {
    const response = await get("/api/getMatch?id=" + matchId)
    const matchData = await response.json();
    return matchData;
}

async function getCurrentMatch() {
    const response = await get("/api/getCurrentMatch")
    const matchData = await response.json();
    return matchData;
}

async function updateCurrentMatch() {
    const matchData = await getCurrentMatch();
    updateMatchUI(matchData);
}

function updateMatchUI(matchData) {
    const homeRowCurrent = document.getElementById("home-row-current");
    homeRowCurrent.querySelector("#home-goal-minus-button").addEventListener("click", async () => {
        matchData.homeScore = matchData.homeScore - 1;
        await updateMatch(matchData);
        await updateMatchUI(matchData);
    });

    homeRowCurrent.querySelector("#home-goal-add-button").addEventListener("click", async () => {
        matchData.homeScore = matchData.homeScore + 1;
        await updateMatch(matchData);
        await updateMatchUI(matchData);
    });

    homeRowCurrent.querySelector("#home-team-score").innerHTML = JSON.stringify(matchData.homeScore);
    homeRowCurrent.querySelector("#home-team-name").innerHTML = matchData.home;


    const awayRowCurrent = document.getElementById("away-row-current");
    awayRowCurrent.querySelector("#away-goal-minus-button").addEventListener("click", async () => {
        matchData.awayScore = matchData.awayScore - 1;
        await updateMatch(matchData);
        await updateMatchUI(matchData);
    });

    awayRowCurrent.querySelector("#away-goal-add-button").addEventListener("click", async () => {
        matchData.awayScore = matchData.awayScore + 1;
        await updateMatch(matchData);
        await updateMatchUI(matchData);
    });

    awayRowCurrent.querySelector("#away-team-score").innerHTML = JSON.stringify(matchData.awayScore);
    awayRowCurrent.querySelector("#away-team-name").innerHTML = matchData.away;
}

async function updateMatchesTable() {
    const matches = await getMatches();
    fillMatchTable(matches);
}

const fillMatchTable =  (matches) => {
    // Table on bottom
    let matchesTable = document.getElementById("matches-table").querySelector("tbody");
    matches.forEach(match => {

        let matchElement = document.createElement("tr");
        matchElement.id = match.id;


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
            let home = matchElement.querySelector("input").value;
            let away = matchElement.querySelectorAll("input")[1].value;
            await updateMatch({
                id: match.id,
                home: home,
                away: away
            });
        });

        let setNextMatchButton = document.createElement("button");
        setNextMatchButton.innerHTML = "Make next match";
        setNextMatchButton.classList.add("btn", "btn-primary");
        setNextMatchButton.style.marginRight = "10px";
        setNextMatchButton.innerHTML = "Set Next Match";
        setNextMatchButton.addEventListener("click", async () => {
            await setNextMatch(match.id);
        });

        let deleteMatchButton = document.createElement("button");
        deleteMatchButton.innerHTML = "Delete";
        deleteMatchButton.classList.add("btn", "btn-primary");
        deleteMatchButton.addEventListener("click", async () => {
            await deleteMatch(match.id);
        });

        buttonTableCell.append(updateButton, setNextMatchButton, deleteMatchButton);
        matchElement.append(buttonTableCell)
        matchesTable.append(matchElement)
    });
}


async function setScore(matchId, team, score) {
    response = await post("/api/setScore", {
        matchId: matchId,
        team: team,
        score: score,
    })

    if (response.status !== 200) {
        console.log("Failed to set new score!")
        return false;
    }
}

async function getScore() {
    response = await get("/api/getScore");
    if (response.status !== 200) {
        console.log("Failed to get score!");
        return false;
    }

    const scoreData = await response.json();
    setHomeScore(scoreData.home);
    setAwayScore(scoreData.away);
}

function setHomeScore(score) {
    document.getElementById("home-score").innerHTML = score;
}

function setAwayScore(score) {
    document.getElementById("away-score").innerHTML = score;
}

const initPage = () => {
    updateCurrentMatch();
    updateMatchesTable();
    updateGameStatusUI();
    updateTimer();

    // EXAMPLES
    updateMatchUI({
        home: "Home",
        homeScore: 2,
        away: "Away",
        awayScore: 1
    });
    fillMatchTable([{"id": 1, title: "test1", "home": "test", away: "away"}]);
};

initPage();


async function updateGameStatusUI() {
    document.getElementById("game-status").innerHTML = await getGameStatus();
}

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
});

document.querySelector("#add-new-match-button").addEventListener("click", async () => {
    console.log("hello");
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


document.querySelector("#game-preview-scene-button").addEventListener("click", async () => {
    await gamePreviewScene();
    await updateGameStatusUI();
});

document.querySelector("#timer-submit-button").addEventListener("click", async () => {
    await setTimer(document.getElementById("timer-input").value);
    await updateTimer();
});