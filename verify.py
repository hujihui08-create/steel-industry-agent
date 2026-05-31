import paramiko, hashlib

host = "124.220.135.122"
user = "ubuntu"
password = "Hu051419"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

print("=== 容器内 /app/server ===")
stdin, stdout, stderr = ssh.exec_command("sudo docker exec steel-backend md5sum /app/server && sudo docker exec steel-backend ls -la /app/server", timeout=10)
print(stdout.read().decode())

print("=== 容器内 CheckSmsVerifyCode 字符串验证 ===")
stdin, stdout, stderr = ssh.exec_command("sudo docker exec steel-backend strings /app/server | grep -n 'CheckSmsVerifyCode\|SendVerificationCode\|##code##'", timeout=10)
print(stdout.read().decode())

print("=== 直接测试 SMS API（curl 到后端）===")
stdin, stdout, stderr = ssh.exec_command("sudo docker exec steel-backend wget -q -O- --post-data='{\"phone\":\"13800138000\"}' --header='Content-Type: application/json' http://localhost:8080/api/v1/auth/sms-code 2>&1", timeout=30)
print(stdout.read().decode())

print("=== 最新日志 ===")
stdin, stdout, stderr = ssh.exec_command("sudo docker logs steel-backend --tail 5 2>&1", timeout=10)
print(stdout.read().decode())

ssh.close()

# 本地二进制 MD5
with open(r"C:\Users\Chzy1\Desktop\agent\backend\steel-backend", "rb") as f:
    md5 = hashlib.md5(f.read()).hexdigest()
print(f"\n本地二进制 MD5: {md5}")
