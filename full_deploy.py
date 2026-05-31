import paramiko
import time

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

def run(cmd, timeout=300):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out.strip())
    if err: print(f"STDERR: {err.strip()}")
    print(f"Exit: {exit_code}")
    return exit_code

print("=== Step 1: git fetch + reset ===")
run("cd /opt/steel-agent && git remote -v", 10)
run("cd /opt/steel-agent && git fetch origin master", 60)
run("cd /opt/steel-agent && git reset --hard origin/master", 10)
run("cd /opt/steel-agent && git log --oneline -3", 10)

print("\n=== Step 2: docker compose build backend (this will take a few minutes) ===")
ret = run("cd /opt/steel-agent && sudo docker compose build backend --no-cache 2>&1", 600)
if ret != 0:
    print("BUILD FAILED! Check errors above.")
    ssh.close()
    exit(1)

print("\n=== Step 3: docker compose up -d ===")
run("cd /opt/steel-agent && sudo docker compose up -d backend", 120)

ssh.close()

print("\nWaiting 10s...")
time.sleep(10)

import urllib.request
try:
    resp = urllib.request.urlopen("https://steel.dundun.store")
    print(f"steel.dundun.store HTTP {resp.status}")
except Exception as e:
    print(f"Unreachable: {e}")
