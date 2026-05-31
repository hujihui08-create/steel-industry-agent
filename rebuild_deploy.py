import paramiko
import time

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

commands = [
    "cd /opt/steel-agent && git pull",
    "cd /opt/steel-agent && sudo docker compose build backend --no-cache",
    "cd /opt/steel-agent && sudo docker compose up -d backend",
]

for cmd in commands:
    print(f"\n{'='*60}")
    print(f"Running: {cmd}")
    print('='*60)
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out)
    if err:
        print(f"STDERR: {err}")
    if exit_code != 0:
        print(f"WARNING: exit code {exit_code}")

ssh.close()

print("\nWaiting 10s for container to start...")
time.sleep(10)

import urllib.request
try:
    resp = urllib.request.urlopen("https://steel.dundun.store")
    print(f"steel.dundun.store HTTP {resp.status}")
except Exception as e:
    print(f"Unreachable: {e}")
