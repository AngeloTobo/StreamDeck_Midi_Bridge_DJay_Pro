@echo off
REM ==================================================================
REM  DJ Rig Launcher
REM  Starts loopMIDI (virtual MIDI port) + Elgato Stream Deck app.
REM  Run this each time before you DJ. Open djay Pro yourself after.
REM ==================================================================

REM --- Edit these two paths if your installs live somewhere else ---
REM  (Tip: right-click the app's shortcut -> Properties -> "Target" shows the real path.)
set "LOOPMIDI=C:\Program Files (x86)\Tobias Erichsen\loopMIDI\loopMIDI.exe"
set "STREAMDECK=C:\Program Files\Elgato\StreamDeck\StreamDeck.exe"

echo.
echo   Starting DJ rig...
echo.

REM --- 1) loopMIDI: recreates your saved "StreamDeck" virtual port ---
tasklist /fi "imagename eq loopMIDI.exe" | find /i "loopMIDI.exe" >nul
if errorlevel 1 (
  echo   [*] Launching loopMIDI...
  start "" /min "%LOOPMIDI%"
  timeout /t 3 >nul
) else (
  echo   [ok] loopMIDI already running.
)

REM --- 2) Stream Deck app: loads your MIDI Bridge plugin + your keys ---
tasklist /fi "imagename eq StreamDeck.exe" | find /i "StreamDeck.exe" >nul
if errorlevel 1 (
  echo   [*] Launching Stream Deck...
  start "" "%STREAMDECK%"
) else (
  echo   [ok] Stream Deck already running.
)

REM --- 3) (Optional) auto-open djay Pro ---
REM  djay Pro on Windows is a Microsoft Store app, so it can't be launched
REM  by a normal path. To enable it:
REM    1) In PowerShell run:  get-StartApps
REM    2) Copy djay's AppID, then uncomment the line below and paste it in:
REM  start "" explorer.exe shell:AppsFolder\PASTE_DJAY_APPID_HERE

echo.
echo   Done. Open djay Pro and you're ready to play.
echo   (You can close this window.)
timeout /t 4 >nul
