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
        $openedByApp = ($null -eq $pres)
        if ($openedByApp) { $pres = $app.Presentations.Open($full, -1, 0, -1) }  # ReadOnly, not Untitled, WithWindow
        try { $pres.Windows.Item(1).Activate() } catch { }
        Write-Result @{ ok = $true; opened = $true; openedByApp = $openedByApp; name = [string]$pres.Name; slideCount = [int]$pres.Slides.Count }
        return
    }

    $app = Get-RunningApp

    $pres = $null
    $show = $null
    if ($null -ne $app) {
        foreach ($p in $app.Presentations) {
            if ($p.FullName -ieq $PptxPath) { $pres = $p; break }
        }
        if ($null -ne $pres) {
            foreach ($w in $app.SlideShowWindows) {
                if ($w.Presentation.FullName -ieq $PptxPath) { $show = $w; break }
            }
        }
    }

    if ($Action -eq 'Status') {
        $status = @{ ok = $true; running = [bool]($null -ne $pres); slideShowActive = [bool]($null -ne $show) }
        if ($null -ne $pres) {
            $status.name = [string]$pres.Name
            $status.slideCount = [int]$pres.Slides.Count
            $status.currentSlide = 0
            try {
                if ($null -ne $show) { $status.currentSlide = [int]$show.View.CurrentShowPosition }
                else { $status.currentSlide = [int]$pres.Windows.Item(1).View.Slide.SlideIndex }
            } catch { }
        }
        Write-Result $status
        return
    }

    if ($Action -eq 'Close') {
        $closed = 0
        if ($null -ne $pres) {
            $pres.Saved = -1
            $pres.Close()
            $closed++
            if ($closed -gt 0 -and $app.Presentations.Count -eq 0) { $app.Quit() }
        }
        Write-Result @{ ok = $true; closed = $true; closedCount = $closed }
        return
    }

    if ($null -eq $pres) {
        if ($Action -eq 'Active') { Write-Result @{ ok = $true; presentation = $null }; return }
        if ($Action -eq 'ExitShow') { Write-Result @{ ok = $true; exited = $true }; return }
        Write-Fail 'POWERPOINT_NOT_RUNNING'
        return
    }

    $inShow = ($null -ne $show)
    $count = [int]$pres.Slides.Count
    function Get-LinkedSlide {
        try {
            if ($inShow) { return [int]$show.View.CurrentShowPosition }
            return [int]$pres.Windows.Item(1).View.Slide.SlideIndex
        } catch { return 0 }
    }

    switch ($Action) {
        'Active' {
            Write-Result @{ ok = $true; presentation = @{ name = [string]$pres.Name; slideCount = $count; currentSlide = (Get-LinkedSlide) } }
        }
        'Next' {
            if ($inShow) {
                $clickIndex = [int]$show.View.GetClickIndex()
                $clickCount = [int]$show.View.GetClickCount()
                # -2 is msoClickStateAfterAllAnimations; -1 is before automatic animations.
                if ($clickIndex -ne -2 -and $clickCount -gt [Math]::Max(0, $clickIndex)) {
                    $show.View.GotoClick([Math]::Max(0, $clickIndex) + 1)
                } else { $show.View.Next() }
            }
            else { $pres.Windows.Item(1).View.GotoSlide([Math]::Min((Get-LinkedSlide) + 1, $count)) }
            Write-Result @{ ok = $true; currentSlide = (Get-LinkedSlide) }
        }
        'Previous' {
            if ($inShow) {
                $clickIndex = [int]$show.View.GetClickIndex()
                if ($clickIndex -eq -2) { $clickIndex = [int]$show.View.GetClickCount() }
                if ($clickIndex -gt 0) { $show.View.GotoClick($clickIndex - 1) }
                else { $show.View.Previous() }
            }
            else { $pres.Windows.Item(1).View.GotoSlide([Math]::Max((Get-LinkedSlide) - 1, 1)) }
            Write-Result @{ ok = $true; currentSlide = (Get-LinkedSlide) }
        }
        'GoTo' {
            if ($Index -lt 1 -or $Index -gt $count) { Write-Fail 'INVALID_SLIDE_INDEX'; return }
            if ($inShow) { $show.View.GotoSlide($Index) }
            else { $pres.Windows.Item(1).View.GotoSlide($Index) }
            Write-Result @{ ok = $true; currentSlide = (Get-LinkedSlide) }
        }
        'StartShow' {
            if (-not $inShow) { $null = $pres.SlideShowSettings.Run() }
            Write-Result @{ ok = $true; started = $true }
        }
        'ExitShow' {
            if ($inShow) { $show.View.Exit() }
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
