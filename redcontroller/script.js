let ws;
let currentScores = { r1: 0, r2: 0, r3: 0 };

function connect() {
    const host = window.location.hostname;
    ws = new WebSocket(`ws://${host}:2932`);
    
    ws.onopen = function() {
        console.log('Red controller connected to server');
        document.getElementById('connectionStatus').textContent = 'Connected';
        document.getElementById('connectionStatus').className = 'text-center mb-4 text-green-500';
    };
    
    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        updateDisplay(data);
    };
    
    ws.onclose = function() {
        console.log('Red controller disconnected');
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
        const message = { command: 'score', side, value };
        ws.send(JSON.stringify(message));
        console.log('Sent:', message);
    } else {
        alert('Not connected to server!');
    }
}

function updateScore(scoreType, change) {
    let newValue = Math.max(0, currentScores[scoreType] + change);
    currentScores[scoreType] = newValue;
    document.getElementById(`${scoreType}Input`).value = newValue;
    sendScore(scoreType, newValue);
}

function setScore(scoreType) {
    const inputValue = parseInt(document.getElementById(`${scoreType}Input`).value);
    if (isNaN(inputValue) || inputValue < 0) {
        alert('Please enter a valid non-negative number');
        return;
    }
    currentScores[scoreType] = inputValue;
    sendScore(scoreType, inputValue);
}

function resetScores() {
    if (confirm('Reset all red team scores?')) {
        ['r1', 'r2', 'r3'].forEach(scoreType => {
            currentScores[scoreType] = 0;
            document.getElementById(`${scoreType}Input`).value = 0;
            sendScore(scoreType, 0);
        });
    }
}

function updateDisplay(data) {
    if (data.red_team_name) {
        document.getElementById('teamName').textContent = data.red_team_name;
    }
    
    if (data.r1 !== undefined) {
        currentScores.r1 = data.r1;
        document.getElementById('r1Score').textContent = data.r1;
        document.getElementById('r1Input').value = data.r1;
    }
    if (data.r2 !== undefined) {
        currentScores.r2 = data.r2;
        document.getElementById('r2Score').textContent = data.r2;
        document.getElementById('r2Input').value = data.r2;
    }
    if (data.r3 !== undefined) {
        currentScores.r3 = data.r3;
        document.getElementById('r3Score').textContent = data.r3;
        document.getElementById('r3Input').value = data.r3;
    }
    
    const total = currentScores.r1 * 30 + currentScores.r2 * 40 + currentScores.r3 * 80;
    document.getElementById('totalScore').textContent = total;
}

window.addEventListener('load', connect);