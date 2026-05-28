"""Deploy frontend: tar + SCP + record git version for traceability.

Code maintenance flow:
  - Local git is the source of truth (push to GitHub as usual)
  - This script packages only frontend source (small, no node_modules/.git)
  - Server stores deployed commit SHA in .deployed-commit
  - Rollback: git checkout <old-commit> && python deploy.py
"""
import paramiko
import subprocess
import sys
import os

HOST = "124.220.135.122"
USER = "ubuntu"
PASSWORD = "Hu051419"
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
TAR_NAME = "deploy.tar.gz"
LOCAL_TAR = os.path.join(AGENT_DIR, TAR_NAME)
REMOTE_TAR = f"/tmp/{TAR_NAME}"
REMOTE_PROJECT = "/opt/steel-agent"

def run_local(cmd, cwd=None):
    print(f"  [local] {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr}")
        return None
    return result.stdout.strip()

def main():
    # Step 0: Get current git info for traceability
    print("=" * 50)
    print("Step 0: 记录当前 git 版本...")
    print("=" * 50)

    commit = run_local("git rev-parse --short HEAD", cwd=AGENT_DIR)
    branch = run_local("git rev-parse --abbrev-ref HEAD", cwd=AGENT_DIR)
    message = run_local("git log -1 --format=%s", cwd=AGENT_DIR)
    date    = run_local("git log -1 --format=%ci", cwd=AGENT_DIR)

    if not commit:
        print("  ⚠ 无 git 信息，继续部署")
        commit = "unknown"
        branch = "unknown"
        message = "unknown"
        date = "unknown"

    print(f"  Branch:  {branch}")
    print(f"  Commit:  {commit}")
    print(f"  Message: {message}")
    print(f"  Date:    {date}")

    # Step 1: Package frontend source only (exclude node_modules, .git, dist)
    print("\n" + "=" * 50)
    print("Step 1: 打包前端源码...")
    print("=" * 50)

    PROJECT_DIR = os.path.join(AGENT_DIR, "steel-agent-web")
    exclude_args = (
        "--exclude=node_modules "
        "--exclude=dist "
        "--exclude=.git "
        "--exclude=.vite "
        "--exclude=.cache "
        "--exclude=.env.local "
        "--exclude=*.log"
    )

    if os.path.exists(LOCAL_TAR):
        os.remove(LOCAL_TAR)

    if run_local(f'tar -czf "{LOCAL_TAR}" {exclude_args} -C "{PROJECT_DIR}" .') is None:
        return 1

    size_mb = os.path.getsize(LOCAL_TAR) / (1024 * 1024)
    print(f"  ✓ 打包完成: {size_mb:.2f} MB")

    # Step 2: Upload tar
    print("\n" + "=" * 50)
    print("Step 2: 上传到服务器...")
    print("=" * 50)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
        sftp = client.open_sftp()

        def progress_callback(transferred, total):
            pct = transferred / total * 100 if total > 0 else 0
            print(f"\r  上传中... {transferred/(1024*1024):.1f}/{total/(1024*1024):.1f} MB ({pct:.0f}%)", end="")

        sftp.put(LOCAL_TAR, REMOTE_TAR, callback=progress_callback)
        sftp.close()
        print(f"\n  ✓ 上传完成")

        # Step 3: Extract + record version
        print("\n" + "=" * 50)
        print("Step 3: 解压并记录版本...")
        print("=" * 50)

        cmd = (
            f"cd {REMOTE_PROJECT} && "
            f"sudo tar -xzf {REMOTE_TAR} -C steel-agent-web/ && "
            f"echo '{commit} {branch} {date} {message}' | sudo tee .deployed-commit > /dev/null && "
            f"echo '✓ 已解压，版本记录完毕'"
        )
        stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        exit_code = stdout.channel.recv_exit_status()

        if out:
            print(f"  {out.strip()}")
        if err:
            print(f"  [stderr] {err.strip()}")
        if exit_code != 0:
            print(f"\n  ✗ 解压失败 (exit {exit_code})")
            return exit_code

        # Step 4: Docker build
        print("\n" + "=" * 50)
        print("Step 4: Docker 编译...")
        print("=" * 50)

        cmd = f"cd {REMOTE_PROJECT} && docker compose -f docker-compose.prod.yml build --no-cache frontend 2>&1"
        stdin, stdout, stderr = client.exec_command(cmd, timeout=600)

        while True:
            line = stdout.readline()
            if not line:
                break
            print(f"  {line.strip()}")

        exit_code = stdout.channel.recv_exit_status()
        if exit_code != 0:
            err_text = stderr.read().decode('utf-8', errors='replace')
            if err_text:
                print(f"  [stderr] {err_text}")
            print(f"\n  ✗ 编译失败 (exit {exit_code})")
            return exit_code

        print(f"  ✓ 编译完成")

        # Step 5: Restart
        print("\n" + "=" * 50)
        print("Step 5: 重启前端...")
        print("=" * 50)

        cmd = f"cd {REMOTE_PROJECT} && docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate frontend 2>&1"
        stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        exit_code = stdout.channel.recv_exit_status()

        if out:
            print(f"  {out.strip()}")
        if err:
            print(f"  {err.strip()}")

        if exit_code == 0:
            print(f"\n  ✓ 前端已更新！")
            print(f"  ✓ 部署版本: {commit} — {message}")

        return exit_code

    finally:
        client.close()
        if os.path.exists(LOCAL_TAR):
            os.remove(LOCAL_TAR)
            print(f"  ✓ 已清理临时文件")

if __name__ == "__main__":
    sys.exit(main())
