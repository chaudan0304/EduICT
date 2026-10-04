# PowerShell Phase 12.2 Automated Execution Script
param()

$ErrorActionPreference = "Stop"
$samplePptx = "D:\DU_AN\EduICT\uploads\temp\tmp_1789048068266_79bqkk\source.pptx"
$installer100 = "$env:TEMP\p122-Setup-1.0.0.exe"
$installer101 = "$env:TEMP\p122-Setup-1.0.1.exe"
$installDir = "$env:TEMP\EduMaster P122\App"
$userData = "$env:TEMP\EduMaster-P122-data"
$outDir = "$env:TEMP\p122-out"

Write-Host "=== PHASE 12.2 VALIDATION RUNNER ===" -ForegroundColor Cyan
Write-Host "Install Dir : $installDir"
Write-Host "UserData Dir: $userData"
Write-Host "Output Dir  : $outDir"

# Cleanup old test state
Get-Process -Name "EduMaster" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
if (Test-Path $outDir) { Remove-Item -Recurse -Force $outDir }
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
if (Test-Path "$env:TEMP\EduMaster P122") { Remove-Item -Recurse -Force "$env:TEMP\EduMaster P122" }
if (Test-Path $userData) { Remove-Item -Recurse -Force $userData }

# --- STEP 1: FRESH INSTALL 1.0.0 ---
Write-Host "`n>>> [STEP 1] Fresh Install 1.0.0 into path with spaces..." -ForegroundColor Yellow
Copy-Item 'release\EduMaster-Setup.exe' $installer100 -Force
$proc = Start-Process -FilePath $installer100 -ArgumentList "/S", "/currentuser", "/D=$installDir" -Wait -PassThru
Write-Host "Installer exit code: $($proc.ExitCode)"

$exePath = Join-Path $installDir "EduMaster.exe"
if (-not (Test-Path $exePath)) { throw "EduMaster.exe does not exist in $installDir" }
$exeItem = Get-Item $exePath
$exeSha = (Get-FileHash -Path $exePath -Algorithm SHA256).Hash
$uninstallerPath = Join-Path $installDir "Uninstall EduMaster.exe"
$uninstallerExists = Test-Path $uninstallerPath

$startMenuShortcut = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\EduMaster.lnk"
$shortcutExists = Test-Path $startMenuShortcut

# Registry check
$reg = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue |
       Where-Object { $_.DisplayName -match "EduMaster" } | Select-Object -First 1

$installInfo = [ordered]@{
  exitCode = $proc.ExitCode
  exeExists = $true
  exePath = $exePath
  exeSize = $exeItem.Length
  exeSha256 = $exeSha
  uninstallerExists = $uninstallerExists
  shortcutExists = $shortcutExists
  registry = if ($reg) {
    [ordered]@{
      DisplayName = $reg.DisplayName
      DisplayVersion = $reg.DisplayVersion
      Publisher = $reg.Publisher
      InstallLocation = $reg.InstallLocation
      UninstallString = $reg.UninstallString
    }
  } else { $null }
}
$installInfo | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $outDir "01-install-100.json") -Encoding utf8
Write-Host "Install 1.0.0 completed successfully. Exe size: $($exeItem.Length) bytes, SHA256: $exeSha" -ForegroundColor Green

# --- STEP 2: CORE FLOW (SEED) ---
Write-Host "`n>>> [STEP 2] Core Flow (Seed class, students, lesson, initial backup)..." -ForegroundColor Yellow
$seedOut = & node desktop/smoke/installed-e2e.cjs "$installDir" "$userData" seed "--sample=$samplePptx"
$seedOut | Set-Content (Join-Path $outDir "02-seed.json") -Encoding utf8
Write-Host "Seed completed." -ForegroundColor Green

# --- STEP 3: RESTART & PERSISTENCE VERIFY ---
Write-Host "`n>>> [STEP 3] Restart & Persistence Verify..." -ForegroundColor Yellow
$verify1 = & node desktop/smoke/installed-e2e.cjs "$installDir" "$userData" verify
$verify1 | Set-Content (Join-Path $outDir "03-verify-1.json") -Encoding utf8
Write-Host "Verify 1 completed." -ForegroundColor Green

# --- STEP 4: POWERPOINT INTEGRATION (PPT & PPTNEG) ---
Write-Host "`n>>> [STEP 4] PowerPoint Bridge Integration..." -ForegroundColor Yellow
$pptOut = & node desktop/smoke/installed-e2e.cjs "$installDir" "$userData" ppt
$pptOut | Set-Content (Join-Path $outDir "04-ppt.json") -Encoding utf8
Write-Host "PPT flow completed." -ForegroundColor Green

Write-Host "`n>>> [STEP 5] PowerPoint Negative Tests (A, C, D)..." -ForegroundColor Yellow
$pptNegOut = & node desktop/smoke/installed-e2e.cjs "$installDir" "$userData" pptneg
$pptNegOut | Set-Content (Join-Path $outDir "05-pptneg.json") -Encoding utf8
Write-Host "PPT negative tests completed." -ForegroundColor Green

# --- STEP 6: BACKUP & RESTORE INTEGRITY ---
Write-Host "`n>>> [STEP 6] Backup Creation & Verification..." -ForegroundColor Yellow
$backupOut = & node desktop/smoke/installed-e2e.cjs "$installDir" "$userData" backup
$backupOut | Set-Content (Join-Path $outDir "06-backup.json") -Encoding utf8
Write-Host "Backup verify completed." -ForegroundColor Green

# --- STEP 7: UPDATE FLOW (1.0.0 -> 1.0.1) ---
Write-Host "`n>>> [STEP 7] Update Flow (1.0.0 -> 1.0.1)..." -ForegroundColor Yellow
$updateProc = Start-Process -FilePath $installer101 -ArgumentList "/S", "/currentuser", "/D=$installDir" -Wait -PassThru
Write-Host "Update installer exit code: $($updateProc.ExitCode)"

$updateExeItem = Get-Item $exePath
$updateExeSha = (Get-FileHash -Path $exePath -Algorithm SHA256).Hash
$fileVer = (Get-Item $exePath).VersionInfo.ProductVersion
Write-Host "Updated Exe ProductVersion: $fileVer, SHA256: $updateExeSha"

$verifyAfterUpdate = & node desktop/smoke/installed-e2e.cjs "$installDir" "$userData" verify
$verifyAfterUpdate | Set-Content (Join-Path $outDir "07-verify-after-update.json") -Encoding utf8
Write-Host "Verify after update completed." -ForegroundColor Green

# --- STEP 8: CRASH & FORCE CLOSE RECOVERY ---
Write-Host "`n>>> [STEP 8] Crash & Force Close Recovery..." -ForegroundColor Yellow
$crashOut = & node desktop/smoke/installed-e2e.cjs "$installDir" "$userData" crash
$crashOut | Set-Content (Join-Path $outDir "08-crash.json") -Encoding utf8
Write-Host "Crash completed." -ForegroundColor Green

Write-Host "`n>>> [STEP 9] Verify App Recovery after Crash..." -ForegroundColor Yellow
$verifyAfterCrash = & node desktop/smoke/installed-e2e.cjs "$installDir" "$userData" verify
$verifyAfterCrash | Set-Content (Join-Path $outDir "09-verify-after-crash.json") -Encoding utf8
Write-Host "Verify after crash completed." -ForegroundColor Green

# --- STEP 10: REAL UNINSTALL & USER DATA ISOLATION ---
Write-Host "`n>>> [STEP 10] Real Uninstall & Data Isolation..." -ForegroundColor Yellow
$uninstallProc = Start-Process -FilePath $uninstallerPath -ArgumentList "/S", "_?=$installDir" -Wait -PassThru
Start-Sleep -Seconds 2
Write-Host "Uninstaller exit code: $($uninstallProc.ExitCode)"

$exeStillExists = Test-Path $exePath
$shortcutStillExists = Test-Path $startMenuShortcut
$userDataPreserved = Test-Path "$userData\data\edumaster.sqlite"

$uninstallReport = [ordered]@{
  uninstallerExitCode = $uninstallProc.ExitCode
  exeRemoved = (-not $exeStillExists)
  shortcutRemoved = (-not $shortcutStillExists)
  userDataDirStillExists = (Test-Path $userData)
  databaseStillExists = $userDataPreserved
  uploadsStillExists = (Test-Path "$userData\data\uploads")
}
$uninstallReport | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $outDir "10-uninstall.json") -Encoding utf8
Write-Host "Uninstall completed. Exe removed: $(-not $exeStillExists), User data preserved: $userDataPreserved" -ForegroundColor Green

# --- STEP 11: REINSTALL & DATA RECOVERY ---
Write-Host "`n>>> [STEP 11] Reinstall 1.0.0 & Data Recovery..." -ForegroundColor Yellow
$reinstallProc = Start-Process -FilePath $installer100 -ArgumentList "/S", "/currentuser", "/D=$installDir" -Wait -PassThru
Write-Host "Reinstall exit code: $($reinstallProc.ExitCode)"

$verifyAfterReinstall = & node desktop/smoke/installed-e2e.cjs "$installDir" "$userData" verify
$verifyAfterReinstall | Set-Content (Join-Path $outDir "11-verify-after-reinstall.json") -Encoding utf8
Write-Host "Verify after reinstall completed." -ForegroundColor Green

Write-Host "`n=== ALL P12.2 RUNNER STEPS COMPLETED ===" -ForegroundColor Cyan
