import paramiko

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

print("=== Build processes ===")
stdin, stdout, stderr = ssh.exec_command("ps aux | grep -E 'runc.*executor|buildx|compose.*build' | grep -v grep | wc -l && echo '---' && ps aux | grep -E 'runc.*executor|buildx|compose.*build' | grep -v grep", timeout=10)
out = stdout.read().decode()
print(out)

if "runc" not in out:
    print("\n=== Build seems done, checking results ===")
    stdin, stdout, stderr = ssh.exec_command("sudo docker images steel-agent-backend --format '{{.ID}}\t{{.CreatedAt}}'", timeout=10)
    out = stdout.read().decode()
    print(f"Images: {out}")
    
    stdin, stdout, stderr = ssh.exec_command("sudo docker ps --filter name=steel-backend --format '{{.Names}}\t{{.Status}}'", timeout=10)
    out = stdout.read().decode()
    print(f"Container: {out}")
    
    stdin, stdout, stderr = ssh.exec_command("sudo docker logs steel-backend --tail 5 2>&1", timeout=10)
    out = stdout.read().decode()
    print(f"Logs: {out}")

ssh.close()
