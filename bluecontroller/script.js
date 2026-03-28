let ws;
let currentScores = { b1: 0, b2: 0 };
let currentTTT = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

const ROW_POINTS = [80, 40, 30];

function connect() {
    const host = window.location.hostname;
    ws = new WebSocket(`ws://${host}:2932`);

    ws.onopen = function() {
        console.log('Blue controller connected to server');
        document.getElementById('connectionStatus').textContent = 'Connected';
        document.getElementById('connectionStatus').className = 'text-center mb-4 text-green-500';
    };

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        updateDisplay(data);
    };

    ws.onclose = function() {
        console.log('Blue controller disconnected');
        document.getElementById('connectionStatus').textContent = 'Disconnected';
        document.getElementById('connectionStatus').className = 'text-center mb-4 text-red-500';
        setTimeout(connect, 3000);
    };

    ws.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

function sendScore(side, value) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ command: 'score', side, value }));
    } else {
        alert('Not connected to server!');
    }
}

function sendTTT(row, column) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            command: 'ttt',
            side: 'b',
            row,
            column,
        }));
    }
}

function updateScore(scoreType, change) {
    const newValue = Math.max(0, currentScores[scoreType] + change);
    currentScores[scoreType] = newValue;
    document.getElementById(`${scoreType}Input`).value = newValue;
    sendScore(scoreType, newValue);
}

function setScore(scoreType) {
    const inputValue = parseInt(document.getElementById(`${scoreType}Input`).value, 10);
    if (isNaN(inputValue) || inputValue < 0) {
        alert('Please enter a valid non-negative number');
        return;
    }
    currentScores[scoreType] = inputValue;
    sendScore(scoreType, inputValue);
}

function resetScores() {
    if (confirm('Reset all blue team scores?')) {
        ['b1', 'b2'].forEach(scoreType => {
            currentScores[scoreType] = 0;
            document.getElementById(`${scoreType}Input`).value = 0;
            sendScore(scoreType, 0);
        });
    }
}

function calculateTTTPointsForBlue(ttt) {
    let points = 0;
    ttt.forEach((row, rowIndex) => {
        const rowValue = ROW_POINTS[rowIndex] || 0;
        row.forEach((cell) => {
            if (cell === 2) points += rowValue;
        });
    });
    return points;
}

function updateTTT(ttt = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]) {
    const cells = document.querySelectorAll('#tttGrid .ttt-cell');
    ttt.flat().forEach((value, index) => {
        const cell = cells[index];
        if (!cell) return;
        if (value === 1) {
            cell.textContent = 'R';
            cell.className = 'ttt-cell bg-red-500 h-20 rounded text-3xl font-bold';
        } else if (value === 2) {
            cell.textContent = 'B';
            cell.className = 'ttt-cell bg-blue-600 h-20 rounded text-3xl font-bold';
        } else {
            cell.textContent = '';
            cell.className = 'ttt-cell bg-blue-700 hover:bg-blue-600 h-20 rounded text-3xl font-bold';
        }
    });
}

function updateDisplay(data) {
    if (data.blue_team_name) {
        document.getElementById('blueTeamLabel').textContent = data.blue_team_name;
    }

    if (data.b1 !== undefined) {
        currentScores.b1 = data.b1;
        document.getElementById('b1Value').textContent = data.b1;
        document.getElementById('b1Input').value = data.b1;
    }
    if (data.b2 !== undefined) {
        currentScores.b2 = data.b2;
        document.getElementById('b2Value').textContent = data.b2;
        document.getElementById('b2Input').value = data.b2;
    }

    currentTTT = data.ttt || [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const tttPoints = calculateTTTPointsForBlue(currentTTT);
    const total = currentScores.b1 * 10 + currentScores.b2 * 10 + tttPoints;
    document.getElementById('blueTotalScore').textContent = total;

    updateTTT(currentTTT);
}

window.addEventListener('load', connect);
