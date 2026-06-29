#!/bin/bash
# DBGuard Agent — Debian/Ubuntu
# Uso: curl -fsSL http://SEU_SERVIDOR/api/agent/download/linux-debian | bash -s -- --token SEU_TOKEN --server http://SEU_SERVIDOR

set -e

AGENT_VERSION="1.0.0"
AGENT_DIR="/opt/dbguard-agent"
SERVICE_NAME="dbguard-agent"

# Parse args
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --token)  TOKEN="$2";  shift ;;
    --server) SERVER="$2"; shift ;;
  esac
  shift
done

if [ -z "$TOKEN" ] || [ -z "$SERVER" ]; then
  echo "❌ Uso: install.sh --token SEU_TOKEN --server http://SEU_SERVIDOR"
  exit 1
fi

echo "================================================"
echo "   DBGuard Agent — Instalação"
echo "================================================"
echo "Servidor: $SERVER"
echo "Token: ${TOKEN:0:8}..."

# Instalar dependências
echo "[1/5] Instalando dependências..."
yum update -q -y
yum install -y python3 python3-pip curl tar gzip

# Instalar bibliotecas Python
pip3 install requests --quiet

# Criar diretório
echo "[2/5] Criando estrutura..."
mkdir -p $AGENT_DIR/backups
mkdir -p $AGENT_DIR/logs

# Criar arquivo de config
cat > $AGENT_DIR/config.json << CONFIG
{
  "token": "$TOKEN",
  "server_url": "$SERVER",
  "agent_version": "$AGENT_VERSION",
  "backup_dir": "/tmp/dbguard_backups"
}
CONFIG

# Criar script principal do agente
cat > $AGENT_DIR/agent.py << 'PYEOF'
#!/usr/bin/env python3
import json
import os
import time
import tarfile
import hashlib
import requests
import subprocess
from datetime import datetime
from pathlib import Path

CONFIG_FILE = '/opt/dbguard-agent/config.json'
LOG_FILE    = '/opt/dbguard-agent/logs/agent.log'

def log(msg):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, 'a') as f:
        f.write(line + '\n')

def load_config():
    with open(CONFIG_FILE) as f:
        return json.load(f)

def heartbeat(config):
    try:
        requests.post(f"{config['server_url']}/api/agent/heartbeat", json={
            'token': config['token'],
            'agent_version': config['agent_version'],
            'os_info': subprocess.check_output(['uname', '-a']).decode().strip()
        }, timeout=10)
    except Exception as e:
        log(f"Heartbeat falhou: {e}")

def get_schedules(config):
    try:
        res = requests.get(f"{config['server_url']}/api/agent/config/{config['token']}", timeout=10)
        return res.json()
    except Exception as e:
        log(f"Erro ao buscar config: {e}")
        return None

def md5_file(filepath):
    h = hashlib.md5()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

def create_backup(source_path, job_id, config):
    log(f"Iniciando backup: {source_path}")
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_name = f"backup_{job_id}_{timestamp}.tar.gz"
    backup_path = f"/tmp/dbguard_backups/{backup_name}"

    os.makedirs('/tmp/dbguard_backups', exist_ok=True)

    manifest = {
        'backup_date': datetime.now().isoformat(),
        'source_path': source_path,
        'files': []
    }

    try:
        with tarfile.open(backup_path, 'w:gz') as tar:
            source = Path(source_path)
            if not source.exists():
                raise Exception(f"Diretório não encontrado: {source_path}")

            for filepath in source.rglob('*'):
                if filepath.is_file():
                    rel_path = str(filepath.relative_to(source))
                    tar.add(str(filepath), arcname=rel_path)
                    manifest['files'].append({
                        'path': rel_path,
                        'size': filepath.stat().st_size,
                        'md5': md5_file(str(filepath))
                    })

        file_size_mb = os.path.getsize(backup_path) / (1024 * 1024)
        log(f"Backup criado: {backup_name} ({file_size_mb:.2f} MB, {len(manifest['files'])} arquivos)")
        return backup_path, backup_name, file_size_mb, manifest

    except Exception as e:
        if os.path.exists(backup_path):
            os.remove(backup_path)
        raise e

def upload_backup(backup_path, backup_name, config, destination):
    log(f"Enviando backup para {destination}...")
    try:
        with open(backup_path, 'rb') as f:
            res = requests.post(
                f"{config['server_url']}/api/agent/upload",
                files={'file': (backup_name, f, 'application/gzip')},
                data={'token': config['token'], 'destination': destination},
                timeout=300
            )
        return res.json().get('storage_path', backup_name)
    except Exception as e:
        log(f"Erro no upload: {e}")
        raise e

def report_status(config, job_id, status, file_name=None, file_size_mb=None, storage_path=None, error=None):
    try:
        requests.post(f"{config['server_url']}/api/agent/report", json={
            'token': config['token'],
            'job_id': job_id,
            'status': status,
            'file_name': file_name,
            'file_size_mb': file_size_mb,
            'storage_path': storage_path,
            'error_message': error
        }, timeout=10)
    except Exception as e:
        log(f"Erro ao reportar status: {e}")

def check_and_run(config):
    now = datetime.now()
    data = get_schedules(config)
    if not data:
        return

    for schedule in data.get('schedules', []):
        if schedule['hour'] == now.hour and schedule['minute'] == now.minute:
            log(f"Executando agendamento: {schedule['id']}")
            job_id = schedule.get('job_id')

            backup_path = None
            try:
                backup_path, backup_name, file_size_mb, manifest = create_backup(
                    schedule['source_path'], schedule['id'], config
                )
                storage_path = upload_backup(backup_path, backup_name, config, schedule['destination'])
                report_status(config, job_id, 'success', backup_name, file_size_mb, storage_path)
                log(f"✅ Backup concluído com sucesso!")

            except Exception as e:
                log(f"❌ Erro no backup: {e}")
                report_status(config, job_id, 'failed', error_message=str(e))

            finally:
                if backup_path and os.path.exists(backup_path):
                    os.remove(backup_path)

def main():
    log("DBGuard Agent iniciado")
    config = load_config()
    heartbeat_counter = 0

    while True:
        try:
            heartbeat_counter += 1
            if heartbeat_counter >= 5:
                heartbeat(config)
                heartbeat_counter = 0

            check_and_run(config)
        except Exception as e:
            log(f"Erro no loop principal: {e}")

        time.sleep(60)

if __name__ == '__main__':
    main()
PYEOF

chmod +x $AGENT_DIR/agent.py

# Criar serviço systemd
echo "[3/5] Criando serviço systemd..."
cat > /etc/systemd/system/$SERVICE_NAME.service << SERVICE
[Unit]
Description=DBGuard Backup Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/dbguard-agent/agent.py
Restart=always
RestartSec=30
StandardOutput=append:/opt/dbguard-agent/logs/agent.log
StandardError=append:/opt/dbguard-agent/logs/agent.log

[Install]
WantedBy=multi-user.target
SERVICE

# Ativar serviço
echo "[4/5] Ativando serviço..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl start $SERVICE_NAME

echo "[5/5] Verificando..."
sleep 3
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "✅ DBGuard Agent instalado e rodando!"
else
    echo "⚠️ Agente instalado mas não iniciou. Verifique: journalctl -u $SERVICE_NAME"
fi

echo ""
echo "================================================"
echo "   DBGuard Agent instalado com sucesso!"
echo "================================================"
echo "  Logs: tail -f /opt/dbguard-agent/logs/agent.log"
echo "  Status: systemctl status $SERVICE_NAME"
echo "================================================"
