@echo off
setlocal
if not defined EASYMSA_WSL_DISTRO set "EASYMSA_WSL_DISTRO=Ubuntu"
if not defined EASYMSA_SSH_KEY set "EASYMSA_SSH_KEY=%USERPROFILE%\.ssh\_msa-web.pem"
set "WSLENV=%WSLENV%:EASYMSA_SSH_KEY/p:EASYMSA_SSH_KNOWN_HOSTS/p:EASYMSA_SSH_TARGET:EASYMSA_SSH_PORT"
wsl.exe -d "%EASYMSA_WSL_DISTRO%" --cd "%~dp0." -- python3 scripts/local-dev.py reconnect
pause
