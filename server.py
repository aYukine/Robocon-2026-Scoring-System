import asyncio
import websockets
import json
import threading
import socket
import time
import os
import math

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.connect(('10.255.255.255', 1))
IPAddr = s.getsockname()[0]
s.close()

controller_connections: list = []
display_connected = False

timer_running = False
start_time = time.monotonic()

game_time = 180

log = ""

data = {
    "red_team_name": "",
    "blue_team_name": "",
    "game_clock": game_time,
    "overlay_timer": 0,
    "overlay_message": "",
    "r1": 0,
    "r2": 0,
    "r3": 0,
    "b1": 0,
    "b2": 0,
    "b3": 0
}


def update_connections():
    if display_connected:
        print("Display Connected: Yes")
        print(f"Controller Connections: {len(controller_connections)}")
    else:
        print("Display Connected: No")
        print(f"Controller Connections: {len(controller_connections)}")


async def handle_controller(websocket):
    global controller_connections, data, start_time, timer_running, log
    controller_connections.append(websocket)
    update_connections()

    try:
        async for message in websocket:

            rev_data = json.loads(message)
            print(f"Controller received: {message}")
            command = rev_data["command"]
            
            if command == "setTeams":
                data['red_team_name'] = rev_data["redTeamName"]
                data['blue_team_name'] = rev_data["blueTeamName"]

            elif command == "score":
                side = rev_data['side']
                score = rev_data["value"]
                data[side] = score
                timer_running = False

            elif command == "resetAll":
                reset()
                timer_running = False
                await broadcast_to_controllers(json.dumps({"command": "reset"}))

            elif command == "prepare":
                data["overlay_timer"] = 60
                start_time = time.monotonic()
                timer_running = False

            elif command == "start":
                start_time = time.monotonic()
                timer_running = True

            elif command == "pause":
                if timer_running:
                    timer_running = False

            elif command == "addTime":
                add_time = rev_data['time']
                data["game_clock"] += add_time
            
            elif command == "subTime":
                sub_time = rev_data["time"]
                data["game_clock"] -= sub_time

            data_json = json.dumps(data)
            await broadcast_to_displays(data_json)
            updateFileJson()

    finally:
        controller_connections.remove(websocket)
        update_connections()


async def handle_display(websocket):
    global display_connected, display_ws
    display_connected = True
    display_ws = websocket
    update_connections()

    try:
        async for message in websocket:
            print(f"Display received: {message}")
    finally:
        display_connected = False
        update_connections()


async def broadcast_to_displays(message):
    global display_connected
    if display_connected:
        try:
            await display_ws.send(message)
        except websockets.exceptions.ConnectionClosed:
            display_connected = False
            update_connections()


async def broadcast_to_controllers(message):
    global controller_connections
    if controller_connections:
        try:
            print(f"Broadcasting to {len(controller_connections)} controllers")
            tasks = [asyncio.create_task(ws.send(message))
                     for ws in controller_connections]
            await asyncio.gather(*tasks)
        except websockets.exceptions.ConnectionClosed:
            controller_connections = [
                ws for ws in controller_connections if ws.open]
            update_connections()


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
        "r3": 0,
        "b1": 0,
        "b2": 0,
        "b3": 0
    }
    log = ""
    asyncio.run_coroutine_threadsafe(
        broadcast_to_displays(json.dumps(data)), server_loop)


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
                    timer_running = False

            else:
                data["game_clock"] -= elapsed_time
                if data["game_clock"] <= 0:
                    total_red = 30* data["r1"] + 40 * data["r2"] + 80 * data["r3"]
                    total_blue = 30 * data["b1"] + 40 * data["b2"] + 80 * data["b3"]
                    if total_red > total_blue:
                        winner = data["red_team_name"]
                    elif total_blue > total_red:
                        winner = data["blue_team_name"]
                    else:
                        winner = "Draw"
                    data["overlay_timer"] = f"winner : {winner}"
                    # log += f"Game Time:{math.ceil(clock)} - Round {game_round} - Game Finished\n"
                    # log += f"Red Team: {data['red_team_name']} - Score: {total_red}\n"
                    # log += f"Blue Team: {data['blue_team_name']} - Score: {total_blue}\n"
                    timer_running = False
                    log_game()

            start_time = time.monotonic()
            updateFileJson()

            asyncio.run_coroutine_threadsafe(
                broadcast_to_displays(json.dumps(data)), server_loop)
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
