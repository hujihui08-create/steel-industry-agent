import paramiko
import time

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

# Upload binary
print("Uploading compiled binary...")
sftp = ssh.open_sftp()
sftp.put(r"C:\Users\Chzy1\Desktop\agent\backend\steel-backend", "/home/ubuntu/steel-backend")
sftp.close()
print("Binary uploaded!")

# Deploy
cmds = [
    "chmod +x /home/ubuntu/steel-backend && echo OK1",
    "sudo docker cp /home/ubuntu/steel-backend steel-backend:/app/server && echo OK2",
    "sudo docker restart steel-backend && echo OK3",
]

for cmd in cmds:
    print(f"\nRunning: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(out.strip())
    if err.strip():
        print(f"STDERR: {err.strip()}")

ssh.close()

print("\nWaiting 5s...")
time.sleep(5)

import urllib.request
try:
    resp = urllib.request.urlopen("https://steel.dundun.store")
    print(f"steel.dundun.store HTTP {resp.status}")
except Exception as e:
    print(f"Unreachable: {e}")
