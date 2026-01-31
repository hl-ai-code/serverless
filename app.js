/* ============================================================
   Mahjong Score Tracker - Full Logic (app.js)
   ============================================================ */

/* ---------- Constants ---------- */
const playersSeats = ["E","S","W","N"];
const seatNames = {E:"东", S:"南", W:"西", N:"北"};
const winds = ["东", "南", "西", "北"];
const roundsMeta = [];
winds.forEach(wind => {
    playersSeats.forEach(p => {
        roundsMeta.push({ wind, seat: p });
    });
});

/* ---------- Global State ---------- */
let stats = {
    E: {hu:0, fp:0, zimo:0},
    S: {hu:0, fp:0, zimo:0},
    W: {hu:0, fp:0, zimo:0},
    N: {hu:0, fp:0, zimo:0}
};

let players = [];
let seating = {};
let gameState = null;
let historyData = [];

/* ---------- LocalStorage Keys ---------- */
const LS_PLAYERS = "mahjong_players";
const LS_SEATING = "mahjong_seating";
const LS_GAME = "mahjong_game";
const LS_HISTORY = "mahjong_history";

/* ============================================================
   LocalStorage Helpers
   ============================================================ */
function savePlayers() {
    localStorage.setItem(LS_PLAYERS, JSON.stringify(players));
}
function saveSeating() {
    localStorage.setItem(LS_SEATING, JSON.stringify(seating));
}
function saveGameState() {
    const rows = document.querySelectorAll("#rounds tr");
    const roundsData = [];
    rows.forEach(row => {
        const fan = parseInt(row.querySelector(".fan").value) || 0;
        const hu = row.querySelector(".hu").value || "";
        const fp = row.querySelector(".fangpao").value || "";
        roundsData.push({fan, hu, fp});
    });
    const state = {
        rounds: roundsData,
        stats: stats,
        currentRound: getCurrentHighlightedIndex()
    };
    localStorage.setItem(LS_GAME, JSON.stringify(state));
}
function loadPlayers() {
    const raw = localStorage.getItem(LS_PLAYERS);
    players = raw ? JSON.parse(raw) : [];
}
function loadSeating() {
    const raw = localStorage.getItem(LS_SEATING);
    seating = raw ? JSON.parse(raw) : {};
}
function loadGameState() {
    const raw = localStorage.getItem(LS_GAME);
    gameState = raw ? JSON.parse(raw) : null;
}
function loadHistory() {
    const raw = localStorage.getItem(LS_HISTORY);
    historyData = raw ? JSON.parse(raw) : [];
}
function saveHistory() {
    localStorage.setItem(LS_HISTORY, JSON.stringify(historyData));
}

/* ============================================================
   Player List
   ============================================================ */
function renderPlayerList() {
    const container = document.getElementById("playerList");
    container.innerHTML = "";
    players.forEach((name, idx) => {
        const row = document.createElement("div");
        row.className = "player-row";
        const span = document.createElement("span");
        span.className = "name";
        span.textContent = "• " + name;
        const delBtn = document.createElement("button");
        delBtn.textContent = "🗑";
        delBtn.onclick = () => {
            const removed = players[idx];
            players.splice(idx, 1);
            savePlayers();
            Object.keys(seating).forEach(k => {
                if (seating[k] === removed) delete seating[k];
            });
            saveSeating();
            renderPlayerList();
            updateSeatingDropdowns();
            updateHeaders();
        };
        row.appendChild(span);
        row.appendChild(delBtn);
        container.appendChild(row);
    });
}

function addPlayer() {
    const name = prompt("输入玩家名字：");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    players.push(trimmed);
    savePlayers();
    renderPlayerList();
    updateSeatingDropdowns();
}

/* ============================================================
   Seating
   ============================================================ */
function updateSeatingDropdowns() {
    ["E","S","W","N"].forEach(seat => {
        const sel = document.getElementById("seat" + seat);
        const prev = seating[seat] || "";
        sel.innerHTML = `<option value="">--</option>` +
            players.map(p => `<option value="${p}">${p}</option>`).join("");
        sel.value = prev && players.includes(prev) ? prev : "";
        sel.onchange = () => {
            const v = sel.value;
            if (v) seating[seat] = v;
            else delete seating[seat];
            saveSeating();
            updateHeaders();
            updateDropdownLabels();
            updateWindLabels();
        };
    });
}

/* ============================================================
   Headers / Labels
   ============================================================ */
function getSeatLabel(p) {
    const name = seating[p];
    return name ? `${seatNames[p]}（${name}）` : seatNames[p];
}

function updateHeaders() {
    ["E","S","W","N"].forEach(p=>{
        document.getElementById("col" + p).innerHTML =
            getSeatLabel(p) + "<br><span id='stat" + p + "' class='statline'></span>";
    });
    updateStatsDisplay();
}

function updateWindLabels() {
    const rows = document.querySelectorAll("#rounds tr");
    rows.forEach((row, i) => {
        const r = roundsMeta[i];
        const seatLabel = getSeatLabel(r.seat);
        const windLabel = r.wind;
        const isDealer = (r.seat === "E");
        const cell = row.querySelector(".windLabel");
        cell.textContent = `${windLabel}-${seatLabel}`;
        cell.className = isDealer ? "windLabel dealer" : "windLabel";
    });
}

function updateDropdownLabels() {
    const labels = {
        E: getSeatLabel("E"),
        S: getSeatLabel("S"),
        W: getSeatLabel("W"),
        N: getSeatLabel("N")
    };
    document.querySelectorAll(".hu").forEach(sel => {
        const current = sel.value;
        sel.innerHTML = `
            <option value="">--</option>
            <option value="huang">黄庄</option>
            ${Object.keys(labels).map(p => `<option value="${p}">${labels[p]}</option>`).join("")}
        `;
        sel.value = current;
    });
    document.querySelectorAll(".fangpao").forEach(sel => {
        const current = sel.value;
        sel.innerHTML = `
            <option value="">--</option>
            ${Object.keys(labels).map(p => `<option value="${p}">${labels[p]}</option>`).join("")}
            <option value="zimo">自摸</option>
        `;
        sel.value = current;
    });
}

/* ============================================================
   Stats / Scores
   ============================================================ */
function updateStatsDisplay() {
    playersSeats.forEach(p => {
        let stars = "⭐".repeat(stats[p].hu);
        let zimos = "🎉".repeat(stats[p].zimo);
        let cries = "😢".repeat(stats[p].fp);
        document.getElementById("stat" + p).textContent = stars + zimos + cries;
    });
}

function createTable() {
    const tbody = document.getElementById("rounds");
    tbody.innerHTML = "";
    roundsMeta.forEach((r, index) => {
        const tr = document.createElement("tr");
        tr.dataset.index = index;
        tr.innerHTML = `
            <td class="windLabel"></td>
            <td><input type="number" class="fan" value="0" min="0"></td>
            <td><select class="hu">
                <option value="">--</option>
                <option value="huang">黄庄</option>
            </select></td>
            <td><select class="fangpao">
                <option value="">--</option>
            </select></td>
            ${playersSeats.map(p=>`<td class="score ${p}">0</td>`).join("")}
        `;
        tr.addEventListener("click", () => highlightRow(index));
        tbody.appendChild(tr);
    });
    document.querySelectorAll(".hu, .fangpao, .fan").forEach(el=>{
        el.addEventListener("change", () => {
            updateScores();
            saveGameState();
        });
    });
}

function highlightRow(i) {
    document.querySelectorAll("#rounds tr").forEach(row => row.classList.remove("current"));
    const row = document.querySelector(`#rounds tr[data-index="${i}"]`);
    if (row) row.classList.add("current");
}

function getCurrentHighlightedIndex() {
    const row = document.querySelector("#rounds tr.current");
    return row ? parseInt(row.dataset.index) : 0;
}

function updateScores() {
    let totals = {E:0, S:0, W:0, N:0};
    stats = {E:{hu:0,fp:0,zimo:0}, S:{hu:0,fp:0,zimo:0}, W:{hu:0,fp:0,zimo:0}, N:{hu:0,fp:0,zimo:0}};

    document.querySelectorAll("#rounds tr").forEach(row=>{
        let fan = parseInt(row.querySelector(".fan").value) || 0;
        let hu = row.querySelector(".hu").value;
        let fp = row.querySelector(".fangpao").value;
        let scores = {E:0, S:0, W:0, N:0};

        if (hu === "huang") {
            playersSeats.forEach(p => scores[p] = 0);
        }
        else if (hu) {
            if (fp === "zimo") {
                stats[hu].zimo++;
                scores[hu] = 3 * (fan + 8);
                playersSeats.forEach(p=>{
                    if (p !== hu) scores[p] = -(fan + 8);
                });
            } else if (fp) {
                stats[hu].hu++;
                stats[fp].fp++;
                scores[hu] = fan + 24;
                playersSeats.forEach(p=>{
                    if (p === fp) scores[p] = -(fan + 8);
                    else if (p !== hu) scores[p] = -8;
                });
            }
        }

        playersSeats.forEach(p=>{
            row.querySelector(`.${p}`).textContent = scores[p];
            totals[p] += scores[p];
        });
    });

    updateStatsDisplay();
    document.getElementById("sumE").textContent = totals.E;
    document.getElementById("sumS").textContent = totals.S;
    document.getElementById("sumW").textContent = totals.W;
    document.getElementById("sumN").textContent = totals.N;
}

/* ============================================================
   History
   ============================================================ */
function renderHistory() {
    const list = document.getElementById("historyList");
    list.innerHTML = "";
    const fmt = (v) => v > 0 ? `+${v}` : `${v}`;

    historyData.slice().reverse().forEach(entry => {
        const div = document.createElement("div");
        div.style.margin = "4px 0";

        const Ename = entry.seating.E ? `东(${entry.seating.E})` : "东";
        const Sname = entry.seating.S ? `南(${entry.seating.S})` : "南";
        const Wname = entry.seating.W ? `西(${entry.seating.W})` : "西";
        const Nname = entry.seating.N ? `北(${entry.seating.N})` : "北";

        div.textContent =
            `${entry.time}  ` +
            `${Ename}: ${fmt(entry.scores.E)}  ` +
            `${Sname}: ${fmt(entry.scores.S)}  ` +
            `${Wname}: ${fmt(entry.scores.W)}  ` +
            `${Nname}: ${fmt(entry.scores.N)}`;

        list.appendChild(div);
    });
}

/* ============================================================
   Reset Buttons
   ============================================================ */
function resetGame() {
    const totals = {
        E: parseInt(document.getElementById("sumE").textContent) || 0,
        S: parseInt(document.getElementById("sumS").textContent) || 0,
        W: parseInt(document.getElementById("sumW").textContent) || 0,
        N: parseInt(document.getElementById("sumN").textContent) || 0
    };

    const entry = {
        time: new Date().toLocaleString(),
        scores: totals,
        seating: {...seating}
    };

    historyData.push(entry);
    saveHistory();
    renderHistory();

    localStorage.removeItem(LS_GAME);
    localStorage.removeItem(LS_SEATING);

    seating = {};
    stats = {E:{hu:0,fp:0,zimo:0}, S:{hu:0,fp:0,zimo:0}, W:{hu:0,fp:0,zimo:0}, N:{hu:0,fp:0,zimo:0}};

    createTable();
    updateSeatingDropdowns();
    updateHeaders();
    updateDropdownLabels();
    updateWindLabels();
    updateScores();
    highlightRow(0);
}

function resetAll() {
    if (!confirm("确定要全部重置吗？玩家列表和历史记录也会被清空。")) return;

    localStorage.removeItem(LS_PLAYERS);
    localStorage.removeItem(LS_SEATING);
    localStorage.removeItem(LS_GAME);
    localStorage.removeItem(LS_HISTORY);

    players = [];
    seating = {};
    historyData = [];
    stats = {E:{hu:0,fp:0,zimo:0}, S:{hu:0,fp:0,zimo:0}, W:{hu:0,fp:0,zimo:0}, N:{hu:0,fp:0,zimo:0}};

    renderPlayerList();
    renderHistory();

    createTable();
    updateSeatingDropdowns();
    updateHeaders();
    updateDropdownLabels();
    updateWindLabels();
    updateScores();
    highlightRow(0);
}

/* ============================================================
   Collapsible Sections
   ============================================================ */
function initPlayerListCollapse() {
    const header = document.getElementById("playerListHeader");
    const toggle = document.getElementById("playerListToggle");
    const container = document.getElementById("playerListContainer");

    let expanded = true;

    header.onclick = () => {
        expanded = !expanded;
        container.style.display = expanded ? "block" : "none";
        toggle.textContent = expanded ? "▼" : "▲";
    };

    container.style.display = "block";
    toggle.textContent = "▼";
}

function initHistoryCollapse() {
    const header = document.getElementById("historyHeader");
    const toggle = document.getElementById("historyToggle");
    const container = document.getElementById("historyContainer");

    let expanded = false;

    header.onclick = () => {
        expanded = !expanded;
        container.style.display = expanded ? "block" : "none";
        toggle.textContent = expanded ? "▼" : "▲";
    };

    container.style.display = "none";
    toggle.textContent = "▲";
}

/* ============================================================
   Initialization
   ============================================================ */
function init() {
    loadPlayers();
    loadSeating();
    loadGameState();
    loadHistory();

    renderPlayerList();
    updateSeatingDropdowns();

    createTable();
    updateHeaders();
    updateDropdownLabels();
    updateWindLabels();

    if (gameState) {
        gameState.rounds.forEach((r, i) => {
            const row = document.querySelector(`#rounds tr[data-index="${i}"]`);
            if (!row) return;
            row.querySelector(".fan").value = r.fan;
            row.querySelector(".hu").value = r.hu;
            row.querySelector(".fangpao").value = r.fp;
        });
        stats = gameState.stats;
        updateStatsDisplay();
        highlightRow(gameState.currentRound);
    } else {
        highlightRow(0);
    }

    updateScores();
    renderHistory();

    initPlayerListCollapse();
    initHistoryCollapse();

    document.getElementById("addPlayerBtn").onclick = addPlayer;
    document.getElementById("resetGameBtn").onclick = resetGame;
    document.getElementById("resetAllBtn").onclick = resetAll;
}

window.onload = init;
