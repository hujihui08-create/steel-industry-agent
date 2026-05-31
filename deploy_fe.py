import paramiko, os, time

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

dist_dir = r"C:\Users\Chzy1\Desktop\agent\steel-agent-web\dist"

print("Uploading frontend dist...")
sftp = ssh.open_sftp()

for root, dirs, files in os.walk(dist_dir):
    for f in files:
        local_path = os.path.join(root, f)
        rel_path = os.path.relpath(local_path, dist_dir).replace("\\", "/")
        remote_path = f"/tmp/fe-dist/{rel_path}"
        
        remote_dir = os.path.dirname(remote_path).replace("\\", "/")
        try:
            sftp.stat(remote_dir)
        except:
            # Create directory
            parts = remote_dir.strip("/").split("/")
            path = ""
            for p in parts:
                path += "/" + p
                try:
                    sftp.stat(path)
                except:
                    sftp.mkdir(path)
        
        sftp.put(local_path, remote_path)

sftp.close()
print("Uploaded!")

print("Deploying to frontend container...")
cmds = [
    "sudo docker cp /tmp/fe-dist/. steel-frontend:/usr/share/nginx/html/",
    "sudo docker exec steel-frontend nginx -s reload 2>&1 || true",
]
for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    print(f"  {cmd[:60]}...: {out or 'OK'}")

ssh.close()
time.sleep(3)

import urllib.request
try:
    resp = urllib.request.urlopen("https://steel.dundun.store")
    print(f"\nsteel.dundun.store HTTP {resp.status}")
except Exception as e:
    print(f"\nUnreachable: {e}")
