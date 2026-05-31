import paramiko

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

print("=== Active build processes ===")
stdin, stdout, stderr = ssh.exec_command("ps aux | grep -E 'docker.*build|compose.*build|buildx|runc.*executor' | grep -v grep", timeout=10)
out = stdout.read().decode()
print(out or "NO BUILD PROCESSES - build may have completed or failed")

if not out.strip():
    print("\n=== Check docker images ===")
    stdin, stdout, stderr = ssh.exec_command("sudo docker images steel-agent-backend --format '{{.ID}}\t{{.CreatedAt}}\t{{.Size}}'", timeout=10)
    out = stdout.read().decode()
    print(out)
    
    print("\n=== Check containers ===")
    stdin, stdout, stderr = ssh.exec_command("sudo docker ps --filter name=steel-backend --format '{{.Names}}\t{{.Status}}\t{{.Image}}'", timeout=10)
    out = stdout.read().decode()
    print(out)

ssh.close()
