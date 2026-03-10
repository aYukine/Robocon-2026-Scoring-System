let ws;
let currentScores = { b1: 0, b2: 0, b3: 0 };

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
    if (confirm('Reset all blue team scores?')) {
        ['b1', 'b2', 'b3'].forEach(scoreType => {
            currentScores[scoreType] = 0;
            document.getElementById(`${scoreType}Input`).value = 0;
            sendScore(scoreType, 0);
        });
    }
}

function updateDisplay(data) {
    // Update team name
    if (data.blue_team_name) {
        document.getElementById('teamName').textContent = data.blue_team_name;
    }
    
    // Update scores from server
    if (data.b1 !== undefined) {
        currentScores.b1 = data.b1;
        document.getElementById('b1Score').textContent = data.b1;
        document.getElementById('b1Input').value = data.b1;
    }
    if (data.b2 !== undefined) {
        currentScores.b2 = data.b2;
        document.getElementById('b2Score').textContent = data.b2;
        document.getElementById('b2Input').value = data.b2;
    }
    if (data.b3 !== undefined) {
        currentScores.b3 = data.b3;
        document.getElementById('b3Score').textContent = data.b3;
        document.getElementById('b3Input').value = data.b3;
    }
    
    // Calculate and update total
    const total = currentScores.b1 * 30 + currentScores.b2 * 40 + currentScores.b3 * 80;
    document.getElementById('totalScore').textContent = total;
}

// Connect when page loads
window.addEventListener('load', connect);