import paramiko
import time
import os

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

local_base = r"C:\Users\Chzy1\Desktop\agent"
remote_base = "/opt/steel-agent"

files_to_upload = [
    "backend/pkg/sms/sms.go",
    "backend/pkg/sms/sms_test.go",
    "backend/internal/service/auth_service.go",
    "backend/internal/service/admin_settings_service.go",
]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

sftp = ssh.open_sftp()

for f in files_to_upload:
    local_path = os.path.join(local_base, f)
    remote_path = os.path.join(remote_base, f).replace("\\", "/")
    print(f"Uploading: {f}")
    sftp.put(local_path, remote_path)
    print(f"  OK")

sftp.close()
print("\nAll source files uploaded!")
ssh.close()

print("\nNow connecting to run docker compose build...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

print("Running: docker compose build backend --no-cache")
stdin, stdout, stderr = ssh.exec_command("cd /opt/steel-agent && sudo docker compose build backend --no-cache 2>&1", timeout=600)
exit_code = stdout.channel.recv_exit_status()
out = stdout.read().decode()
err = stderr.read().decode()
print(out[-2000:] if len(out) > 2000 else out)
if err:
    print(f"STDERR: {err[-500:]}")
print(f"Build exit code: {exit_code}")

if exit_code == 0:
    print("\nRunning: docker compose up -d backend")
    stdin, stdout, stderr = ssh.exec_command("cd /opt/steel-agent && sudo docker compose up -d backend", timeout=120)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode()
    print(out)
    
    print("Waiting 10s...")
    time.sleep(10)
    
    import urllib.request
    try:
        resp = urllib.request.urlopen("https://steel.dundun.store")
        print(f"steel.dundun.store HTTP {resp.status}")
    except Exception as e:
        print(f"Unreachable: {e}")

ssh.close()
