import paramiko, time

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

print("Uploading...")
sftp = ssh.open_sftp()
sftp.put(r"C:\Users\Chzy1\Desktop\agent\backend\steel-backend", "/home/ubuntu/steel-backend")
sftp.close()
print("Uploaded!")

print("\nDeploying...")
for cmd in [
    "chmod +x /home/ubuntu/steel-backend",
    "sudo docker cp /home/ubuntu/steel-backend steel-backend:/app/server",
    "sudo docker restart steel-backend",
]:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    print(f"  {cmd}: {out}")

ssh.close()

time.sleep(5)
import urllib.request
try:
    resp = urllib.request.urlopen("https://steel.dundun.store")
    print(f"\nsteel.dundun.store HTTP {resp.status}")
except Exception as e:
    print(f"\nUnreachable: {e}")
