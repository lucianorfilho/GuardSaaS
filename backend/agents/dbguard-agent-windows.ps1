# DBGuard Agent — Windows
# Uso: .\dbguard-agent-windows.ps1 -Token SEU_TOKEN -Server http://SEU_SERVIDOR

param(
    [Parameter(Mandatory=$true)][string]$Token,
    [Parameter(Mandatory=$true)][string]$Server
)

$AgentDir    = "C:\DBGuard-Agent"
$ConfigFile  = "$AgentDir\config.json"
$LogFile     = "$AgentDir\logs\agent.log"
$AgentScript = "$AgentDir\agent.ps1"

Write-Host "================================================"
Write-Host "   DBGuard Agent — Instalacao Windows"
Write-Host "================================================"

# Criar estrutura
New-Item -ItemType Directory -Force -Path $AgentDir | Out-Null
New-Item -ItemType Directory -Force -Path "$AgentDir\logs" | Out-Null
New-Item -ItemType Directory -Force -Path "$AgentDir\backups" | Out-Null

# Salvar config
@{
    token          = $Token
    server_url     = $Server
    agent_version  = "1.0.0"
    backup_dir     = "C:\DBGuard-Backups"
} | ConvertTo-Json | Set-Content $ConfigFile

# Criar script principal
@'
param([string]$ConfigFile = "C:\DBGuard-Agent\config.json")

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $msg"
    Write-Host $line
    Add-Content -Path "C:\DBGuard-Agent\logs\agent.log" -Value $line
}

function Send-Heartbeat($config) {
    try {
        $body = @{ token=$config.token; agent_version=$config.agent_version; os_info="Windows" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$($config.server_url)/api/agent/heartbeat" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
    } catch { Write-Log "Heartbeat falhou: $_" }
}

function Get-Schedules($config) {
    try {
        return Invoke-RestMethod -Uri "$($config.server_url)/api/agent/config/$($config.token)" -TimeoutSec 10
    } catch { Write-Log "Erro ao buscar config: $_"; return $null }
}

function Create-Backup($sourcePath, $jobId) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "backup_${jobId}_${timestamp}.zip"
    $backupPath = "C:\DBGuard-Backups\$backupName"
    New-Item -ItemType Directory -Force -Path "C:\DBGuard-Backups" | Out-Null
    Compress-Archive -Path "$sourcePath\*" -DestinationPath $backupPath -Force
    $sizeMB = (Get-Item $backupPath).Length / 1MB
    return $backupPath, $backupName, [math]::Round($sizeMB, 2)
}

function Report-Status($config, $jobId, $status, $fileName=$null, $sizeMB=$null, $storagePath=$null, $error=$null) {
    try {
        $body = @{ token=$config.token; job_id=$jobId; status=$status; file_name=$fileName; file_size_mb=$sizeMB; storage_path=$storagePath; error_message=$error } | ConvertTo-Json
        Invoke-RestMethod -Uri "$($config.server_url)/api/agent/report" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
    } catch { Write-Log "Erro ao reportar: $_" }
}

Write-Log "DBGuard Agent Windows iniciado"
$config = Get-Content $ConfigFile | ConvertFrom-Json
$heartbeatCounter = 0

while ($true) {
    try {
        $heartbeatCounter++
        if ($heartbeatCounter -ge 5) { Send-Heartbeat $config; $heartbeatCounter = 0 }

        $now = Get-Date
        $data = Get-Schedules $config
        if ($data) {
            foreach ($schedule in $data.schedules) {
                if ($schedule.hour -eq $now.Hour -and $schedule.minute -eq $now.Minute) {
                    Write-Log "Executando backup: $($schedule.source_path)"
                    try {
                        $backupPath, $backupName, $sizeMB = Create-Backup $schedule.source_path $schedule.id
                        Report-Status $config $null 'success' $backupName $sizeMB $backupName
                        Write-Log "Backup concluido: $backupName ($sizeMB MB)"
                        Remove-Item $backupPath -Force
                    } catch {
                        Write-Log "Erro no backup: $_"
                        Report-Status $config $null 'failed' -error $_.ToString()
                    }
                }
            }
        }
    } catch { Write-Log "Erro no loop: $_" }
    Start-Sleep 60
}
'@ | Set-Content $AgentScript

# Criar tarefa agendada para iniciar com Windows
$action  = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$AgentScript`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName "DBGuard-Agent" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force | Out-Null

# Iniciar agora
Start-ScheduledTask -TaskName "DBGuard-Agent"

Write-Host ""
Write-Host "================================================"
Write-Host "   DBGuard Agent instalado com sucesso!"
Write-Host "================================================"
Write-Host "  Logs: Get-Content C:\DBGuard-Agent\logs\agent.log -Wait"
Write-Host "================================================"
