let ws;
let gameData = {};

const ROW_POINTS = [80, 40, 30];

function extractTeamImageName(teamName) {
  if (!teamName) return "RED";
  const match = teamName.match(/^[A-Z]+/);
  return match ? match[0] : teamName;
}

function connect() {
  const host = window.location.hostname;
  ws = new WebSocket(`ws://${host}:2931`);

  ws.onopen = function () {
    console.log("Display connected to server");
    document.getElementById("connectionStatus").textContent = "Connected";
    document.getElementById("connectionStatus").className = "text-green-500";
  };

  ws.onmessage = function (event) {
    gameData = JSON.parse(event.data);
    updateDisplay();
  };

  ws.onclose = function () {
    console.log("Display disconnected");
    document.getElementById("connectionStatus").textContent = "Disconnected";
    document.getElementById("connectionStatus").className = "text-red-500";
    setTimeout(connect, 3000);
  };

  ws.onerror = function (error) {
    console.error("WebSocket error:", error);
  };
}

function calculateTTTPoints(ttt = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]) {
  let redPoints = 0;
  let bluePoints = 0;

  ttt.forEach((row, rowIndex) => {
    const rowValue = ROW_POINTS[rowIndex] || 0;
    row.forEach((cell) => {
      if (cell === 1) redPoints += rowValue;
      if (cell === 2) bluePoints += rowValue;
    });
  });

  return { redPoints, bluePoints };
}

function updateDisplay() {
  document.getElementById("redTeamName").textContent = gameData.red_team_name || "RED";
  document.getElementById("blueTeamName").textContent = gameData.blue_team_name || "BLUE";

  const redImageName = extractTeamImageName(gameData.red_team_name || "RED");
  const blueImageName = extractTeamImageName(gameData.blue_team_name || "BLUE");
  
  document.getElementById("redTeamLogo").src = `../public/logo/${redImageName}.png`;
  document.getElementById("blueTeamLogo").src = `../public/logo/${blueImageName}.png`;

  document.getElementById("r1Score").textContent = gameData.r1 || 0;
  document.getElementById("r2Score").textContent = gameData.r2 || 0;
  document.getElementById("b1Score").textContent = gameData.b1 || 0;
  document.getElementById("b2Score").textContent = gameData.b2 || 0;

  const ttt = gameData.ttt || [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const { redPoints, bluePoints } = calculateTTTPoints(ttt);

  const redTotal = (gameData.r1 || 0) * 10 + (gameData.r2 || 0) * 10 + redPoints;
  const blueTotal = (gameData.b1 || 0) * 10 + (gameData.b2 || 0) * 10 + bluePoints;

  document.getElementById("redTotal").textContent = redTotal;
  document.getElementById("blueTotal").textContent = blueTotal;

  const minutes = Math.floor((gameData.game_clock || 0) / 60);
  const seconds = Math.floor((gameData.game_clock || 0) % 60);
  document.getElementById("gameClock").textContent =
    `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  updateModalState();
  updateTTT(ttt);
}

function updateModalState() {
  const modal = document.getElementById("stateModal");
  const title = document.getElementById("stateModalTitle");
  const subtitle = document.getElementById("stateModalSubtitle");
  const displayContent = document.getElementById("displayContent");
  const overlayMessage = (gameData.overlay_message || "").trim();

  const isPreparation = gameData.overlay_timer > 0;
  const isWinner = overlayMessage.startsWith("WINNER:");

  if (isPreparation) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    title.textContent = "PREPARATION";
    subtitle.textContent = `${Math.ceil(gameData.overlay_timer)}s`;
    displayContent.classList.add("blur-sm");
    document.getElementById("overlayMessage").textContent = "";
    return;
  }

  if (isWinner) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    title.textContent = "WINNER";
    subtitle.textContent = overlayMessage.replace(/^WINNER:\s*/, "");
    displayContent.classList.add("blur-sm");
    document.getElementById("overlayMessage").textContent = "";
    return;
  }

  modal.classList.add("hidden");
  modal.classList.remove("flex");
  title.textContent = "";
  subtitle.textContent = "";
  displayContent.classList.remove("blur-sm");
  document.getElementById("overlayMessage").textContent = "";
}

function updateTTT(ttt = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]) {
  const cells = document.querySelectorAll(".ttt-cell");
  ttt.flat().forEach((value, index) => {
    const cell = cells[index];
    if (!cell) return;

    if (value === 1) {
      cell.className = "ttt-cell w-[160px] h-[160px] bg-red-500 border-4 border-white flex items-center justify-center text-7xl font-black text-white";
      cell.textContent = "R";
    } else if (value === 2) {
      cell.className = "ttt-cell w-[160px] h-[160px] bg-blue-600 border-4 border-white flex items-center justify-center text-7xl font-black text-white";
      cell.textContent = "B";
    } else {
      cell.className = "ttt-cell w-[160px] h-[160px] bg-gray-300 border-2 border-gray-200";
      cell.textContent = "";
    }
  });
}

window.addEventListener("load", connect);
