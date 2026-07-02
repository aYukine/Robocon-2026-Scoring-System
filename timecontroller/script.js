let ws;

function connect() {
    const host = window.location.hostname;
    ws = new WebSocket(`ws://${host}:2932`);

    ws.onopen = function() {
        console.log('Time controller connected to server');
        document.getElementById('connectionStatus').textContent = 'Connected';
        document.getElementById('connectionStatus').className = 'text-center mb-4 text-green-500';
    };

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        updateStatus(data);
    };

    ws.onclose = function() {
        console.log('Time controller disconnected');
        document.getElementById('connectionStatus').textContent = 'Disconnected';
        document.getElementById('connectionStatus').className = 'text-center mb-4 text-red-500';
        setTimeout(connect, 3000);
    };

    ws.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

function sendCommand(command, data = {}) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const message = { command, ...data };
        ws.send(JSON.stringify(message));
        console.log('Sent:', message);
    } else {
        alert('Not connected to server!');
    }
}

function setTeams() {
    const redTeamName = document.getElementById('redTeamName').value;
    const blueTeamName = document.getElementById('blueTeamName').value;

    if (!redTeamName || !blueTeamName) {
        alert('Please enter both team names');
        return;
    }

    sendCommand('setTeams', {
        redTeamName,
        blueTeamName,
    });
}

function prepare() {
    sendCommand('prepare');
}

function prepare_2() {
    sendCommand('prepare_2');
}

function startGame() {
    sendCommand('start');
}

function pauseGame() {
    sendCommand('pause');
}

function showWinner() {
    const showButton = document.getElementById('showWinnerButton');
    const winnerMessage = document.getElementById('winnerMessage').value;

    showButton.textContent = showButton.textContent === 'Show Winner' ? 'Hide Winner' : 'Show Winner';
    if (showButton.textContent === 'Show Winner') {
        showButton.classList.remove('bg-red-500');
        showButton.classList.remove('hover:bg-red-700');
        showButton.classList.add('bg-green-500');
        showButton.classList.add('hover:bg-green-600');
    } else {
        showButton.classList.remove('bg-green-500');
        showButton.classList.remove('hover:bg-green-600');
        showButton.classList.add('bg-red-500');
        showButton.classList.add('hover:bg-red-700');
    }

    sendCommand('showWinner', {
        message: winnerMessage
    });
}
function resetAll() {
    if (confirm('Are you sure you want to reset everything?')) {
        sendCommand('resetAll');
        document.getElementById('redTeamName').value = '';
        document.getElementById('blueTeamName').value = '';
    }
}

function addTime() {
    const timeToAdd = parseInt(document.getElementById('addTimeInput').value, 10);
    if (isNaN(timeToAdd) || timeToAdd <= 0) {
        alert('Please enter a valid positive number');
        return;
    }
    sendCommand('addTime', { time: timeToAdd });
}

function subTime() {
    const timeToSub = parseInt(document.getElementById('subTimeInput').value, 10);
    if (isNaN(timeToSub) || timeToSub <= 0) {
        alert('Please enter a valid positive number');
        return;
    }
    sendCommand('subTime', { time: timeToSub });
}

function updateStatus(data) {
    if (data.game_clock !== undefined) {
        const minutes = Math.floor(data.game_clock / 60);
        const seconds = Math.floor(data.game_clock % 60);
        const currentGameClock = document.getElementById('currentGameClock');
        if (currentGameClock) {
            currentGameClock.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    const currentRedTeam = document.getElementById('currentRedTeam');
    const currentBlueTeam = document.getElementById('currentBlueTeam');
    if (currentRedTeam) currentRedTeam.textContent = data.red_team_name || '-';
    if (currentBlueTeam) currentBlueTeam.textContent = data.blue_team_name || '-';

    let status = 'Stopped';
    if (data.overlay_timer > 0) {
        status = `Preparation: ${Math.ceil(data.overlay_timer)}s`;
    } else if ((data.overlay_message || '').startsWith('WINNER:')) {
        status = 'Game Finished';
    }

    const timerStatus = document.getElementById('timerStatus');
    if (timerStatus) timerStatus.textContent = status;
}

window.addEventListener('load', connect);
