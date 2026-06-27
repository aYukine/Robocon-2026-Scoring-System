import asyncio
import websockets
import json
import threading
import socket
import time
import os

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.connect(('10.255.255.255', 1))
IPAddr = s.getsockname()[0]
s.close()

controller_connections: list = []
display_connected = False
display_ws = None

timer_running = False
start_time = time.monotonic()

game_time = 180

log = ""
game_started = False

data = {
    "red_team_name": "",
    "blue_team_name": "",
    "game_clock": game_time,
    "overlay_timer": 0,
    "overlay_message": "",
    "r1": 0,
    "r2": 0,
    "b1": 0,
    "b2": 0,
    "ttt": [[0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]] 
}

ROW_POINTS = [80, 40, 30]


def calculate_ttt_points():
    red_points = 0
    blue_points = 0

    for row_index, row in enumerate(data["ttt"]):
        row_score = ROW_POINTS[row_index]
        for cell in row:
            if cell == 1:
                red_points += row_score
            elif cell == 2:
                blue_points += row_score

    return red_points, blue_points


def calculate_totals():
    ttt_red, ttt_blue = calculate_ttt_points()
    red_total = 10 * data["r1"] + 10 * data["r2"] + ttt_red
    blue_total = 10 * data["b1"] + 10 * data["b2"] + ttt_blue
    return red_total, blue_total


def team_name(team):
    if team == "red":
        return data["red_team_name"] or "RED"
    if team == "blue":
        return data["blue_team_name"] or "BLUE"
    return "Draw"


def get_ttt_winner():
    board = data["ttt"]
    win_lines = [
        [(0, 0), (1, 0), (2, 0)],
        [(0, 1), (1, 1), (2, 1)],
        [(0, 2), (1, 2), (2, 2)],
        [(0, 0), (1, 1), (2, 2)],
        [(0, 2), (1, 1), (2, 0)],
    ]

    for line in win_lines:
        first_row, first_col = line[0]
        first_value = board[first_row][first_col]
        if first_value == 0:
            continue

        if all(board[row][col] == first_value for row, col in line):
            return first_value

    return 0


def evaluate_ttt_winner():
    winner = get_ttt_winner()
    if winner == 1:
        return f"WINNER: {team_name('red')} KUNGFU MASTER"
    if winner == 2:
        return f"WINNER: {team_name('blue')} KUNGFU MASTER"
    return ""

def format_game_clock(seconds):
    remaining = max(0, int(round(seconds)))
    minutes = remaining // 60
    secs = remaining % 60
    return f"{minutes:02d}:{secs:02d}"


def add_log(message):
    global log
    timestamp = format_game_clock(data["game_clock"])
    log += f"[{timestamp}] {message}\n"
    print(f"LOG: {message}")


def update_connections():
    if display_connected:
        print("Display Connected: Yes")
        print(f"Controller Connections: {len(controller_connections)}")
    else:
        print("Display Connected: No")
        print(f"Controller Connections: {len(controller_connections)}")


async def handle_controller(websocket):
    global controller_connections, data, start_time, timer_running, log, game_started
    controller_connections.append(websocket)
    update_connections()

    # Send current state to newly connected controller.
    await websocket.send(json.dumps(data))

    try:
        async for message in websocket:

            rev_data = json.loads(message)
            print(f"Controller received: {message}")
            command = rev_data["command"]
            
            if command == "setTeams":
                data['red_team_name'] = rev_data["redTeamName"]
                data['blue_team_name'] = rev_data["blueTeamName"]
                add_log(f"Teams set: RED={data['red_team_name']}, BLUE={data['blue_team_name']}")

            elif command == "score":
                side = rev_data['side']
                score = rev_data["value"]
                old_score = data[side]
                data[side] = score
                team = "RED" if side[0] == 'r' else "BLUE"
                add_log(f"{team} {side.upper()} score: {old_score} -> {score}")

            elif command == "ttt":
                side = rev_data['side']
                row = rev_data['row']
                column = rev_data['column']

                current = data["ttt"][row][column]
                team = "RED" if side[0] == "r" else "BLUE"

                if current != 0:
                    data["ttt"][row][column] = 0
                    add_log(f"{team} cleared TTT cell ({row}, {column})")
                
                else:
                    if side[0] == "r":
                        data["ttt"][row][column] = 1
                    elif side[0] == "b":
                        data["ttt"][row][column] = 2
                    add_log(f"{team} placed mark at TTT cell ({row}, {column})")

                winner_message = evaluate_ttt_winner()
                if winner_message:
                    data["overlay_timer"] = 0
                    data["overlay_message"] = winner_message
                    timer_running = False
                    add_log(f"TTT WINNER DETECTED: {winner_message}")
                    await broadcast_state()
                    updateFileJson()
                    log_game(log)
                    continue
                elif data["overlay_message"].startswith("WINNER:"):
                    data["overlay_message"] = ""

            elif command == "resetAll":
                add_log("Game reset by operator")
                reset()
                timer_running = False
                game_started = False

            elif command == "prepare":
                data["overlay_timer"] = 60
                data["overlay_message"] = "PREPARATION"
                start_time = time.monotonic()
                timer_running = False
                add_log("Preparation phase started (60s)")

            elif command == "prepare_2":
                data["overlay_timer"] = 10
                data["overlay_message"] = "Starting"
                start_time = time.monotonic()
                timer_running = False
                add_log("Preparation phase started (10s)")
            

            elif command == "start":
                if data["overlay_message"].startswith("WINNER:"):
                    continue
                start_time = time.monotonic()
                timer_running = True
                if not game_started:
                    game_started = True
                    add_log(f"Game started: {data['red_team_name']} vs {data['blue_team_name']} (180s)")
                else:
                    add_log("Game resumed")

            elif command == "pause":
                if timer_running:
                    timer_running = False
                    add_log("Game paused")

            elif command == "addTime":
                add_time = rev_data['time']
                old_time = data["game_clock"]
                data["game_clock"] += add_time
                add_log(f"Time added: +{add_time}s (Total: {old_time:.0f}s -> {data['game_clock']:.0f}s)")
            
            elif command == "subTime":
                sub_time = rev_data["time"]
                old_time = data["game_clock"]
                data["game_clock"] = max(0, data["game_clock"] - sub_time)
                add_log(f"Time subtracted: -{sub_time}s (Total: {old_time:.0f}s -> {data['game_clock']:.0f}s)")

            await broadcast_state()
            updateFileJson()

    finally:
        if websocket in controller_connections:
            controller_connections.remove(websocket)
        update_connections()


async def handle_display(websocket):
    global display_connected, display_ws
    display_connected = True
    display_ws = websocket
    update_connections()

    # Send current state to newly connected display.
    await websocket.send(json.dumps(data))

    try:
        async for message in websocket:
            print(f"Display received: {message}")
    finally:
        display_connected = False
        update_connections()


async def broadcast_to_displays(message):
    global display_connected, display_ws
    if display_connected:
        try:
            await display_ws.send(message)
        except websockets.exceptions.ConnectionClosed:
            display_connected = False
            display_ws = None
            update_connections()


async def broadcast_to_controllers(message):
    global controller_connections
    if controller_connections:
        print(f"Broadcasting to {len(controller_connections)} controllers")
        tasks = [asyncio.create_task(ws.send(message))
                 for ws in controller_connections]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for ws, result in zip(controller_connections[:], results):
            if isinstance(result, Exception):
                if ws in controller_connections:
                    controller_connections.remove(ws)
        update_connections()


async def broadcast_state():
    payload = json.dumps(data)
    await asyncio.gather(
        broadcast_to_displays(payload),
        broadcast_to_controllers(payload)
    )


async def start_controller():
    async with websockets.serve(handle_controller, IPAddr, 2932):
        print("Controller listening on port 2932")
        await asyncio.Future()


async def start_display():
    global display_ws
    async with websockets.serve(handle_display, IPAddr, 2931):
        print("Display server listening on port 2931")
        await asyncio.Future()


def reset():
    global data, log

    data = {
        "red_team_name": "",
        "blue_team_name": "",
        "game_clock": game_time,
        "overlay_timer": 0,
        "overlay_message": "",
        "r1": 0,
        "r2": 0,
        "b1": 0,
        "b2": 0,
        "ttt": [[0, 0, 0],
                [0, 0, 0],
                [0, 0, 0]] 
    }
    log = ""
    add_log("==== NEW GAME SESSION ====\n")
    updateFileJson()
    asyncio.run_coroutine_threadsafe(broadcast_state(), server_loop)


def updateFileJson():
    global data
    file_path = "data/data.json"
    if not os.path.exists(file_path):
        os.makedirs("data")
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)


def log_game(log):
    timestamp = time.strftime("%Y-%m-%d %H-%M-%S", time.localtime())
    file_path = f"data/log_{timestamp}.txt"

    with open(file_path, 'w') as f:
        f.write(log)
        print(f"Game log saved to {file_path}")


def timer():
    global timer_running, start_time, game_time, data, log
    while True:
        if timer_running:
            elapsed_time = time.monotonic() - start_time
            if data["overlay_timer"] > 0:
                data["overlay_timer"] -= elapsed_time
                if data["overlay_timer"] <= 0:
                    data["overlay_timer"] = 0
                    data["overlay_message"] = ""
                    timer_running = False
                    add_log("Preparation phase ended")

            else:
                data["game_clock"] -= elapsed_time
                if data["game_clock"] <= 0:
                    data["game_clock"] = 0
                    total_red, total_blue = calculate_totals()
                    if total_red > total_blue:
                        winner = team_name("red")
                    elif total_blue > total_red:
                        winner = team_name("blue")
                    else:
                        winner = "Draw"
                    data["overlay_timer"] = 0
                    data["overlay_message"] = f"WINNER: {winner}"
                    add_log("\n===== GAME FINISHED =====")
                    add_log(f"Final Score:")
                    add_log(f"  {data['red_team_name']}: {total_red} points")
                    add_log(f"  {data['blue_team_name']}: {total_blue} points")
                    add_log(f"WINNER: {winner}")
                    timer_running = False
                    log_game(log)

            start_time = time.monotonic()
            updateFileJson()

            asyncio.run_coroutine_threadsafe(
                broadcast_state(), server_loop)
            time.sleep(0.05)

def run_servers():
    global server_loop
    server_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(server_loop)

    try:
        server_loop.run_until_complete(
            asyncio.gather(start_controller(), start_display()))
    finally:
        server_loop.close()


server_thread = threading.Thread(target=run_servers)
timer_thread = threading.Thread(target=timer)

server_thread.daemon = True
timer_thread.daemon = True

server_thread.start()
timer_thread.start()

server_thread.join()
timer_thread.join()
