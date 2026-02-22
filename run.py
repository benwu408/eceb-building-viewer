"""Launch ECEB Building Viewer — starts backend and frontend together."""

import subprocess
import sys
import os
import time
import signal

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")

procs: list[subprocess.Popen] = []


def cleanup(*_):
    for p in procs:
        p.terminate()
    for p in procs:
        p.wait()
    sys.exit(0)


signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)


def run():
    # 1. Install backend deps
    print("==> Installing backend dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt", "-q"],
                   cwd=BACKEND_DIR, check=True)

    # 2. Install frontend deps if needed
    if not os.path.isdir(os.path.join(FRONTEND_DIR, "node_modules")):
        print("==> Installing frontend dependencies...")
        subprocess.run(["npm", "install"], cwd=FRONTEND_DIR, check=True)

    # 3. Start backend
    print("==> Starting backend on http://localhost:8000")
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--port", "8000"],
        cwd=BACKEND_DIR,
    )
    procs.append(backend)

    # 4. Start frontend
    print("==> Starting frontend on http://localhost:3000")
    frontend = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=FRONTEND_DIR,
    )
    procs.append(frontend)

    time.sleep(2)
    print("\n==> Open http://localhost:3000 in your browser")
    print("==> Press Ctrl+C to stop\n")

    # Wait for either to exit
    while True:
        for p in procs:
            ret = p.poll()
            if ret is not None:
                print(f"Process {p.args} exited with code {ret}, shutting down...")
                cleanup()
        time.sleep(1)


if __name__ == "__main__":
    run()
