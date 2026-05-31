import paramiko

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

print("=== Check if docker build is running ===")
stdin, stdout, stderr = ssh.exec_command("sudo docker ps -a --format 'table {{.Names}}\t{{.Status}}' | head -15", timeout=10)
out = stdout.read().decode(); err = stderr.read().decode()
print(out)
if err: print(err)

print("=== Check Docker images ===")
stdin, stdout, stderr = ssh.exec_command("sudo docker images | grep steel", timeout=10)
out = stdout.read().decode(); err = stderr.read().decode()
print(out)
if err: print(err)

print("=== Check for any build processes ===")
stdin, stdout, stderr = ssh.exec_command("ps aux | grep -E 'docker|build' | grep -v grep", timeout=10)
out = stdout.read().decode(); err = stderr.read().decode()
print(out)
if err: print(err)

ssh.close()
