param (
    [Parameter(Mandatory = $true)]
    [string]$PptxPath,

    [Parameter(Mandatory = $false)]
    [string]$OutputDir = "",

    [Parameter(Mandatory = $false)]
    [string]$OutputFile = "",

    [Parameter(Mandatory = $false)]
    [ValidateSet("pdf", "single_slide", "all_png")]
    [string]$Mode = "pdf",

    [Parameter(Mandatory = $false)]
    [int]$SlideIndex = 1,

    [Parameter(Mandatory = $false)]
    [int]$Width = 1920,

    [Parameter(Mandatory = $false)]
    [int]$Height = 1080
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

$result = @{
    success    = $false
    mode       = $Mode
    slideCount = 0
    slides     = @()
    pdfPath    = ""
    error      = ""
    durationMs = 0
}

if (-not (Test-Path -LiteralPath $PptxPath)) {
    $result.error = "File PowerPoint khong ton tai: $PptxPath"
    $stopwatch.Stop()
    $result.durationMs = $stopwatch.ElapsedMilliseconds
    $result | ConvertTo-Json -Compress
    exit 1
}

$resolvedPptx = [System.IO.Path]::GetFullPath($PptxPath)

# Xac dinh thu muc va file dich tuyet doi
if ([string]::IsNullOrWhiteSpace($OutputDir) -and -not [string]::IsNullOrWhiteSpace($OutputFile)) {
    $OutputDir = Split-Path -Parent $OutputFile
}

if (-not [string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
    if (-not (Test-Path -LiteralPath $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
}

if (-not [string]::IsNullOrWhiteSpace($OutputFile)) {
    $OutputFile = [System.IO.Path]::GetFullPath($OutputFile)
    $parentDir = Split-Path -Parent $OutputFile
    if (-not (Test-Path -LiteralPath $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
}

$ppt = $null
$presentation = $null

try {
    # 1. Khoi tao PowerPoint COM Object
    $ppt = New-Object -ComObject PowerPoint.Application
    
    # 2. Mo presentation ngam (ReadOnly = True, Untitled = False, WithWindow = False)
    # msoFalse = 0, msoTrue = -1
    $presentation = $ppt.Presentations.Open($resolvedPptx, -1, 0, 0)
    $slideCount = $presentation.Slides.Count
    $result.slideCount = $slideCount

    if ($Mode -eq "pdf") {
        # Xuat toan bo file PPTX sang PDF chuan (ppSaveAsPDF = 32)
        $targetPdf = if (-not [string]::IsNullOrWhiteSpace($OutputFile)) {
            $OutputFile
        }
        else {
            Join-Path $OutputDir "presentation.pdf"
        }

        # Xoa file cu neu co de dam bao khong nham lan
        if (Test-Path -LiteralPath $targetPdf) {
            Remove-Item -LiteralPath $targetPdf -Force -ErrorAction SilentlyContinue
        }

        $presentation.SaveAs($targetPdf, 32)

        if ((Test-Path -LiteralPath $targetPdf) -and ((Get-Item -LiteralPath $targetPdf).Length -gt 1024)) {
            $result.success = $true
            $result.pdfPath = (Resolve-Path -LiteralPath $targetPdf).Path
            $result.fileSizeBytes = (Get-Item -LiteralPath $targetPdf).Length
        }
        else {
            $result.success = $false
            $result.error = "File PDF sau xuat khong ton tai hoac co dung luong 0 byte"
        }

    }
    elseif ($Mode -eq "single_slide") {
        # Xuat 1 slide cu the ra PNG (dung khi retry slide loi)
        if ($SlideIndex -lt 1 -or $SlideIndex -gt $slideCount) {
            throw "SlideIndex hop le tu 1 den $slideCount. Gia tri yeu cau: $SlideIndex"
        }

        $targetImg = if (-not [string]::IsNullOrWhiteSpace($OutputFile)) {
            $OutputFile
        }
        else {
            Join-Path $OutputDir ("slide_{0:D2}.png" -f $SlideIndex)
        }

        if (Test-Path -LiteralPath $targetImg) {
            Remove-Item -LiteralPath $targetImg -Force -ErrorAction SilentlyContinue
        }

        $slide = $presentation.Slides.Item($SlideIndex)
        $slide.Export($targetImg, "PNG", $Width, $Height)

        if ((Test-Path -LiteralPath $targetImg) -and ((Get-Item -LiteralPath $targetImg).Length -gt 1024)) {
            $result.success = $true
            $result.filePath = (Resolve-Path -LiteralPath $targetImg).Path
            $result.fileName = Split-Path -Leaf $targetImg
            $result.sizeBytes = (Get-Item -LiteralPath $targetImg).Length
            $result.slideIndex = $SlideIndex - 1
        }
        else {
            $result.success = $false
            $result.error = "Khong xuat duoc slide $SlideIndex hoac file anh 0 byte"
        }

    }
    elseif ($Mode -eq "all_png") {
        # Che do cu: Xuat tat ca slide ra thu muc anh qua SaveAs PNG (18 = ppSaveAsPNG)
        $resolvedOut = (Resolve-Path -LiteralPath $OutputDir).Path
        $presentation.SaveAs($resolvedOut, 18)

        $slideList = @()
        $hasFailedSlide = $false

        for ($i = 1; $i -le $slideCount; $i++) {
            $foundFile = Get-ChildItem -LiteralPath $resolvedOut -Filter "Slide$i.*" -File | Select-Object -First 1
            if (-not $foundFile) {
                $foundFile = Get-ChildItem -LiteralPath $resolvedOut -File | Where-Object { $_.BaseName -match "Slide\s*$i$" -or $_.BaseName -match "Slide$i$" } | Select-Object -First 1
            }

            if ($foundFile -and $foundFile.Length -gt 1024) {
                $slideList += @{
                    index     = $i - 1
                    fileName  = $foundFile.Name
                    title     = "Slide $i"
                    sizeBytes = $foundFile.Length
                    status    = "completed"
                }
            }
            else {
                $hasFailedSlide = $true
                $slideList += @{
                    index     = $i - 1
                    fileName  = if ($foundFile) { $foundFile.Name } else { "Slide$i.PNG" }
                    title     = "Slide $i"
                    sizeBytes = if ($foundFile) { $foundFile.Length } else { 0 }
                    status    = "failed"
                    error     = "Khong tim thay file anh hop le hoac dung luong = 0 byte"
                }
            }
        }

        $result.slides = $slideList
        # Chi danh dau success = $true neu khong co slide nao bi fail hoac co it nhat 1 slide
        $result.success = ($slideList.Count -gt 0)
        $result.hasFailedSlide = $hasFailedSlide
    }
}
catch {
    $result.error = $_.Exception.Message
    $result.success = $false
}
finally {
    if ($null -ne $presentation) {
        try { $presentation.Close() } catch {}
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null } catch {}
    }
    if ($null -ne $ppt) {
        try { $ppt.Quit() } catch {}
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null } catch {}
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}

$stopwatch.Stop()
$result.durationMs = $stopwatch.ElapsedMilliseconds
$result | ConvertTo-Json -Compress -Depth 4
