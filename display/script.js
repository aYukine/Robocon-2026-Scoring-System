let ws;
let gameData = {};

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

function updateDisplay() {
  document.getElementById("redTeamName").textContent =
    gameData.red_team_name || "RED";
  document.getElementById("blueTeamName").textContent =
    gameData.blue_team_name || "BLUE";

  document.getElementById("r1Score").textContent = gameData.r1 || 0;
  document.getElementById("r2Score").textContent = gameData.r2 || 0;
  document.getElementById("r3Score").textContent = gameData.r3 || 0;
  document.getElementById("b1Score").textContent = gameData.b1 || 0;
  document.getElementById("b2Score").textContent = gameData.b2 || 0;
  document.getElementById("b3Score").textContent = gameData.b3 || 0;

  const redTotal =
    (gameData.r1 || 0) * 30 + (gameData.r2 || 0) * 40 + (gameData.r3 || 0) * 80;
  const blueTotal =
    (gameData.b1 || 0) * 30 + (gameData.b2 || 0) * 40 + (gameData.b3 || 0) * 80;

  document.getElementById("redTotal").textContent = `Total: ${redTotal}`;
  document.getElementById("blueTotal").textContent = `Total: ${blueTotal}`;

  const minutes = Math.floor((gameData.game_clock || 0) / 60);
  const seconds = Math.floor((gameData.game_clock || 0) % 60);
  document.getElementById("gameClock").textContent =
    `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  if (gameData.overlay_timer > 0) {
    document.getElementById("overlayTimer").classList.remove("hidden");
    document.getElementById("overlayTimer").textContent =
      `Preparation: ${Math.ceil(gameData.overlay_timer)}`;
    document.getElementById("gameClockContainer").style.opacity = "0.5";
  } else if (typeof gameData.overlay_timer === "string") {
    document.getElementById("overlayTimer").classList.add("hidden");
    document.getElementById("winnerDisplay").classList.remove("hidden");
    document.getElementById("winnerText").textContent = gameData.overlay_timer;
  } else {
    document.getElementById("overlayTimer").classList.add("hidden");
    document.getElementById("winnerDisplay").classList.add("hidden");
    document.getElementById("gameClockContainer").style.opacity = "1";
  }

  document.getElementById("overlayMessage").textContent =
    gameData.overlay_message || "";
}

window.addEventListener("load", connect);
