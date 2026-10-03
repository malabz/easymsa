#!/usr/bin/env python3
"""Local development bridge. No production config or remote services changed."""
import fcntl
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
STATE = Path('/tmp') / f'easymsa-local-dev-{os.getuid()}'
STATE.mkdir(mode=0o700, exist_ok=True)
if STATE.stat().st_uid != os.getuid() or STATE.is_symlink():
    raise SystemExit('Unsafe runtime directory')
os.chmod(STATE, 0o700)
PID = STATE / 'process.json'
URL = 'http://127.0.0.1:5173/easymsa/'
SSH_KEY = Path(os.environ.get('EASYMSA_SSH_KEY', str(Path.home() / '.ssh' / '_msa-web.pem'))).expanduser()
SSH_KNOWN_HOSTS = Path(os.environ.get('EASYMSA_SSH_KNOWN_HOSTS', str(SSH_KEY.parent / 'known_hosts'))).expanduser()
SSH_TARGET = os.environ.get('EASYMSA_SSH_TARGET', 'root@47.99.84.159')
SSH_PORT = os.environ.get('EASYMSA_SSH_PORT', '22')
HTTP = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def identity(pid):
    try:
        return Path(f'/proc/{pid}/stat').read_text().split(') ')[1].split()[19]
    except (FileNotFoundError, ProcessLookupError):
        return None


def running():
    try:
        info = json.loads(PID.read_text())
        return info if identity(info['pid']) == info['start'] else None
    except (FileNotFoundError, ValueError, KeyError):
        return None


def ready(url):
    try:
        with HTTP.open(url, timeout=2) as response:
            return response.status == 200
    except Exception:
        return False


def free_port(port):
    with socket.socket() as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(('127.0.0.1', port))
        except OSError:
            raise RuntimeError(f'Port {port} is occupied. No existing process was stopped.')


def terminate(process):
    if process is not None and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=8)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


def serve():
    lock = (STATE / 'lock').open('w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise SystemExit('Local development is already running.')
    # Only the lock owner may remove leftover key copies from a crashed session.
    for stale in STATE.glob('ssh-*'):
        if stale.is_dir() and not stale.is_symlink() and stale.stat().st_uid == os.getuid():
            shutil.rmtree(stale)
    ssh = vite = None
    controls = {'stop': False, 'disconnect': False, 'reconnect': False}
    signal.signal(signal.SIGTERM, lambda *_: controls.update(stop=True))
    signal.signal(signal.SIGINT, lambda *_: controls.update(stop=True))
    signal.signal(signal.SIGUSR1, lambda *_: controls.update(disconnect=True))
    signal.signal(signal.SIGUSR2, lambda *_: controls.update(reconnect=True))
    try:
        free_port(5173)
        free_port(18000)
        configured_node = os.environ.get('EASYMSA_NODE_BIN')
        project_node = ROOT.parent / '.runtime' / 'node-v24.21.0-linux-x64' / 'bin' / 'node'
        node = configured_node or (str(project_node) if project_node.is_file() else shutil.which('node'))
        if node:
            version = subprocess.check_output([node, '--version'], text=True).strip()
            if not version.startswith('v24.'):
                raise RuntimeError('EasyMSA requires Node.js 24 LTS. Set EASYMSA_NODE_BIN to its node executable.')
        if not node or not (ROOT / 'node_modules/vite/bin/vite.js').exists():
            raise RuntimeError('Node or installed frontend dependencies missing.')
        # Keep sensitive material on the Linux filesystem with restrictive permissions.
        with tempfile.TemporaryDirectory(prefix='ssh-', dir=STATE) as temporary:
            temporary = Path(temporary)
            key = temporary / 'key'
            key.write_bytes(SSH_KEY.read_bytes())
            key.chmod(0o600)
            known = STATE / 'known_hosts'
            if not known.exists():
                known.write_bytes(SSH_KNOWN_HOSTS.read_bytes() if SSH_KNOWN_HOSTS.exists() else b'')
            known.chmod(0o600)
            ssh_args = ['ssh', '-p', SSH_PORT, '-i', str(key), '-o', 'IdentitiesOnly=yes',
                        '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new',
                        '-o', f'UserKnownHostsFile={known}', '-o', 'ConnectTimeout=15',
                        '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=15',
                        '-o', 'ServerAliveCountMax=3', '-N', '-L',
                        '127.0.0.1:18000:127.0.0.1:8000', SSH_TARGET]

            def connect():
                free_port(18000)
                process = subprocess.Popen(ssh_args, stdin=subprocess.DEVNULL)
                for _ in range(40):
                    if process.poll() is not None:
                        raise RuntimeError('SSH connection failed. Check the development log.')
                    if ready('http://127.0.0.1:18000/api/health'):
                        return process
                    if controls['stop']:
                        terminate(process)
                        raise RuntimeError('Startup cancelled.')
                    time.sleep(0.5)
                terminate(process)
                raise RuntimeError('SSH connected but backend health check failed.')

            ssh = connect()
            env = os.environ.copy()
            env.update(VITE_API_BASE_URL='/api', EASYMSA_LOCAL_BACKEND='1')
            vite = subprocess.Popen([node, str(ROOT / 'node_modules/vite/bin/vite.js'),
                                     '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
                                    cwd=ROOT, env=env, stdin=subprocess.DEVNULL)
            PID.write_text(json.dumps({'pid': os.getpid(), 'start': identity(os.getpid())}))
            print('Local frontend: http://localhost:5173/easymsa/', flush=True)
            notified = False
            while not controls['stop']:
                if vite.poll() is not None:
                    raise RuntimeError('Frontend exited; closing this development session.')
                if controls['disconnect']:
                    controls['disconnect'] = False
                    terminate(ssh)
                    print('SSH tunnel disconnected. Frontend remains available.', flush=True)
                if controls['reconnect']:
                    controls['reconnect'] = False
                    terminate(ssh)
                    try:
                        ssh = connect()
                        notified = False
                        print('SSH tunnel reconnected.', flush=True)
                    except RuntimeError as error:
                        print(str(error), flush=True)
                if ssh.poll() is not None and not notified:
                    print('Backend offline. Use Reconnect-local-dev.cmd to reconnect.', flush=True)
                    notified = True
                time.sleep(0.25)
    except Exception as error:
        print(f'Development startup/runtime error: {error}', flush=True)
    finally:
        terminate(vite)
        terminate(ssh)
        if running() and running()['pid'] == os.getpid():
            PID.unlink(missing_ok=True)
        print('Development processes stopped; temporary SSH key removed.', flush=True)


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else 'status'
    if action == '_serve':
        serve()
        return
    info = running()
    if action == 'start':
        if not info:
            free_port(5173)
            free_port(18000)
            with (STATE / 'development.log').open('a') as log:
                process = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '_serve'],
                                           stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                           start_new_session=True)
            for _ in range(60):
                if process.poll() is not None:
                    raise RuntimeError(f'Start failed. See {STATE}/development.log')
                if running() and ready(URL) and ready('http://127.0.0.1:5173/api/health'):
                    break
                time.sleep(0.5)
            else:
                terminate(process)
                raise RuntimeError(f'Start timed out. See {STATE}/development.log')
        print('Frontend: http://localhost:5173/easymsa/')
        if not ready('http://127.0.0.1:5173/api/health'):
            raise RuntimeError('Frontend is running, but backend is offline. Run Reconnect-local-dev.cmd.')
        print('Backend connected: True')
    elif action in ('stop', 'disconnect', 'reconnect'):
        if not info:
            print('No managed development session is running.')
            return
        os.kill(info['pid'], {'stop': signal.SIGTERM, 'disconnect': signal.SIGUSR1,
                             'reconnect': signal.SIGUSR2}[action])
        if action == 'stop':
            for _ in range(80):
                if not running():
                    print('Stopped this session only.')
                    return
                time.sleep(0.25)
            raise RuntimeError('Stop did not finish; inspect session status.')
        print(f'{action} requested.')
    elif action == 'status':
        print(json.dumps({'running': bool(info), 'frontend': ready(URL),
                          'backend': ready('http://127.0.0.1:5173/api/health'),
                          'url': 'http://localhost:5173/easymsa/', 'log': str(STATE / 'development.log')}))
    else:
        raise RuntimeError('Usage: local-dev.py start|stop|status|disconnect|reconnect')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
