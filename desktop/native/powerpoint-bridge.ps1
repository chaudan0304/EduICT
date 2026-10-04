#requires -Version 5.1
# powerpoint-bridge.ps1 - Desktop Bridge cho Microsoft PowerPoint (Phase 11).
#
# - Script CO DINH, moi lan goi thuc hien DUNG 1 hanh dong trong ValidateSet (khong nhan lenh tu do).
# - Tham so duoc Node truyen qua mang args (shell:false), KHONG noi chuoi thanh lenh.
# - Chi chua ASCII: thong diep tieng Viet nam o phia Node (map theo `code`).
# - Luon in 1 dong JSON {ok:true,...} hoac {ok:false,code}; chi tiet ky thuat -> stderr (Node ghi log).
# - File goc luon mo READ-ONLY de original.pptx (source of truth) khong bi sua.

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Probe', 'Open', 'Close', 'Status', 'Active', 'Next', 'Previous', 'GoTo', 'StartShow', 'ExitShow')]
    [string]$Action,
    [string]$PptxPath = '',
    [string]$AllowedRoot = '',
    [int]$Index = 0
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Result([hashtable]$Data) {
    [Console]::Out.WriteLine(($Data | ConvertTo-Json -Compress -Depth 4))
}

function Write-Fail([string]$Code) {
    Write-Result @{ ok = $false; code = $Code }
}

function Get-ErrorCode($Err, [string]$Default) {
    $hr = 0
    $ex = $Err.Exception
    if ($ex -is [System.Runtime.InteropServices.COMException]) { $hr = $ex.ErrorCode }
    elseif ($ex.InnerException -is [System.Runtime.InteropServices.COMException]) { $hr = $ex.InnerException.ErrorCode }
    if ($hr -eq -2147221164) { return 'POWERPOINT_NOT_INSTALLED' }   # 0x80040154 REGDB_E_CLASSNOTREG
    if ($hr -eq -2147418111) { return 'POWERPOINT_BUSY' }            # 0x80010001 RPC_E_CALL_REJECTED
    if ($hr -eq -2147417846) { return 'POWERPOINT_BUSY' }            # 0x8001010A RPC_E_SERVERCALL_RETRYLATER
    return $Default
}

function Get-RunningApp {
    for ($i = 0; $i -lt 3; $i++) {
        try {
            $app = [System.Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application')
            if ($null -ne $app) { return $app }
        } catch {
            Start-Sleep -Milliseconds 250
        }
    }
    return $null
}

function Get-CurrentSlide($App) {
    try {
        if ($App.SlideShowWindows.Count -gt 0) { return [int]$App.SlideShowWindows.Item(1).View.CurrentShowPosition }
        if ($App.Windows.Count -gt 0) { return [int]$App.ActiveWindow.View.Slide.SlideIndex }
    } catch { }
    return 0
}

try {
    if ($Action -eq 'Probe') {
        $installed = Test-Path -LiteralPath 'Registry::HKEY_CLASSES_ROOT\PowerPoint.Application'
        Write-Result @{ ok = $true; installed = [bool]$installed }
        return
    }

    if ($Action -eq 'Open') {
        if (-not (Test-Path -LiteralPath $PptxPath -PathType Leaf)) { Write-Fail 'PRESENTATION_NOT_FOUND'; return }
        $full = (Resolve-Path -LiteralPath $PptxPath).ProviderPath
        $app = Get-RunningApp
        if ($null -eq $app) { $app = New-Object -ComObject PowerPoint.Application }
        $app.Visible = -1
        $pres = $null
        foreach ($p in $app.Presentations) {
            if ($p.FullName -ieq $full) { $pres = $p; break }
        }
        if ($null -eq $pres) { $pres = $app.Presentations.Open($full, -1, 0, -1) }  # ReadOnly, not Untitled, WithWindow
        try { $pres.Windows.Item(1).Activate() } catch { }
        Write-Result @{ ok = $true; opened = $true; name = [string]$pres.Name; slideCount = [int]$pres.Slides.Count }
        return
    }

    $app = Get-RunningApp

    if ($Action -eq 'Status') {
        if ($null -eq $app) { Write-Result @{ ok = $true; running = $false; slideShowActive = $false }; return }
        Write-Result @{ ok = $true; running = $true; slideShowActive = [bool]($app.SlideShowWindows.Count -gt 0) }
        return
    }

    if ($Action -eq 'Close') {
        $closed = 0
        if ($null -ne $app -and $AllowedRoot) {
            # Chi dong cac bai trinh chieu nam trong vung presentations cua EduMaster; khong dong file khac cua nguoi dung.
            $root = [System.IO.Path]::GetFullPath($AllowedRoot).TrimEnd('\') + '\'
            for ($i = $app.Presentations.Count; $i -ge 1; $i--) {
                $p = $app.Presentations.Item($i)
                if ($p.FullName.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
                    $p.Saved = -1
                    $p.Close()
                    $closed++
                }
            }
            if ($closed -gt 0 -and $app.Presentations.Count -eq 0) { $app.Quit() }
        }
        Write-Result @{ ok = $true; closed = $true; closedCount = $closed }
        return
    }

    if ($null -eq $app -or $app.Presentations.Count -eq 0) {
        if ($Action -eq 'Active') { Write-Result @{ ok = $true; presentation = $null }; return }
        if ($Action -eq 'ExitShow') { Write-Result @{ ok = $true; exited = $true }; return }
        Write-Fail 'POWERPOINT_NOT_RUNNING'
        return
    }

    $inShow = ($app.SlideShowWindows.Count -gt 0)
    $count = [int]$app.ActivePresentation.Slides.Count

    switch ($Action) {
        'Active' {
            $pr = $app.ActivePresentation
            Write-Result @{ ok = $true; presentation = @{ name = [string]$pr.Name; slideCount = $count; currentSlide = (Get-CurrentSlide $app) } }
        }
        'Next' {
            if ($inShow) { $app.SlideShowWindows.Item(1).View.Next() }
            else { $app.ActiveWindow.View.GotoSlide([Math]::Min((Get-CurrentSlide $app) + 1, $count)) }
            Write-Result @{ ok = $true; currentSlide = (Get-CurrentSlide $app) }
        }
        'Previous' {
            if ($inShow) { $app.SlideShowWindows.Item(1).View.Previous() }
            else { $app.ActiveWindow.View.GotoSlide([Math]::Max((Get-CurrentSlide $app) - 1, 1)) }
            Write-Result @{ ok = $true; currentSlide = (Get-CurrentSlide $app) }
        }
        'GoTo' {
            if ($Index -lt 1 -or $Index -gt $count) { Write-Fail 'INVALID_SLIDE_INDEX'; return }
            if ($inShow) { $app.SlideShowWindows.Item(1).View.GotoSlide($Index) }
            else { $app.ActiveWindow.View.GotoSlide($Index) }
            Write-Result @{ ok = $true; currentSlide = (Get-CurrentSlide $app) }
        }
        'StartShow' {
            if (-not $inShow) { $null = $app.ActivePresentation.SlideShowSettings.Run() }
            Write-Result @{ ok = $true; started = $true }
        }
        'ExitShow' {
            if ($inShow) { $app.SlideShowWindows.Item(1).View.Exit() }
            Write-Result @{ ok = $true; exited = $true }
        }
    }
}
catch {
    [Console]::Error.WriteLine("[powerpoint-bridge] $Action failed: $($_.Exception.Message)")
    $default = 'POWERPOINT_CONTROL_FAILED'
    if ($Action -eq 'Open') { $default = 'POWERPOINT_START_FAILED' }
    Write-Fail (Get-ErrorCode $_ $default)
}
