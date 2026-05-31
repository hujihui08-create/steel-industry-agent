import paramiko

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

print("Killing stuck build...")
stdin, stdout, stderr = ssh.exec_command("sudo pkill -f 'docker compose build' 2>/dev/null; sudo pkill -f docker-buildx 2>/dev/null; echo done", timeout=10)
out = stdout.read().decode()
print(out)

print("\nWait and verify build stopped...")
import time
time.sleep(2)

stdin, stdout, stderr = ssh.exec_command("ps aux | grep -E 'buildx|compose.*build' | grep -v grep | wc -l", timeout=10)
count = stdout.read().decode().strip()
print(f"Build processes remaining: {count}")

ssh.close()
