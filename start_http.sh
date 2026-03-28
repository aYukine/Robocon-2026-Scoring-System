ip=$(ifconfig wlo1 | grep 'inet ' | awk '{print $2}')

python3 -m http.server --bind $ip 8080