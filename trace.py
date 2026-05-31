import paramiko

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

print("=== steel-frontend nginx config ===")
stdin, stdout, stderr = ssh.exec_command("sudo docker exec steel-frontend cat /etc/nginx/conf.d/default.conf 2>&1", timeout=10)
print(stdout.read().decode())

print("=== steel-nginx all config files ===")
stdin, stdout, stderr = ssh.exec_command("sudo docker exec steel-nginx ls /etc/nginx/conf.d/ 2>&1 && echo '---' && sudo docker exec steel-nginx cat /etc/nginx/nginx.conf 2>&1", timeout=10)
print(stdout.read().decode())

print("=== docker network inspect ===")
stdin, stdout, stderr = ssh.exec_command("sudo docker network inspect steel-network --format '{{json .Containers}}' 2>&1 | python3 -m json.tool 2>/dev/null | head -40", timeout=10)
print(stdout.read().decode())

print("\n=== 最新日志 ===")
stdin, stdout, stderr = ssh.exec_command("sudo docker logs steel-backend --tail 10 2>&1", timeout=10)
print(stdout.read().decode())

ssh.close()
