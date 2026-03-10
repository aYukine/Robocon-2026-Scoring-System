# How to run:

1. Install dependencies:

```bash
pip install websockets
```
only need that one unless other not installed by default. I forgot which are not default but you can just try running the code and see if it throws an error about missing dependencies.

2. Run the score system server:  
this is the server that control the data
```bash
python server.py
```

3. Run the http server:  
This is the server that serves pages for display and control for the system connectivity
```bash
python -m http.server <port>
```

4. Open the server pages:  
go to browser and put:
```bash
http://<ip>:<port>
```

# Data:

after running everything, the data is at the 

```bash
http://<ip>:<port>/data/data.json
```
