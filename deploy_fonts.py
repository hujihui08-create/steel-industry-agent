import paramiko, time

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

sftp = ssh.open_sftp()
for f in ["simsun.ttc", "simhei.ttf"]:
    local = rf"C:\Users\Chzy1\Desktop\agent\backend\{f}"
    remote = f"/home/ubuntu/{f}"
    print(f"Uploading {f} ({os.path.getsize(local)} bytes)...")
    sftp.put(local, remote)
sftp.close()
print("Uploaded!")

for cmd in [
    "sudo docker cp /home/ubuntu/simsun.ttc steel-backend:/app/simsun.ttc",
    "sudo docker cp /home/ubuntu/simhei.ttf steel-backend:/app/simhei.ttf",
    "sudo docker restart steel-backend",
]:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    stdout.channel.recv_exit_status()
    print(f"  {cmd}: OK")

ssh.close()
time.sleep(5)

import urllib.request, os
try:
    resp = urllib.request.urlopen("https://steel.dundun.store")
    print(f"\nsteel.dundun.store HTTP {resp.status}")
except Exception as e:
    print(f"\nUnreachable: {e}")
