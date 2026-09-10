param (
    [Parameter(Mandatory=$true)]
    [string]$PptxPath,

    [Parameter(Mandatory=$true)]
    [string]$OutputDir
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$result = @{
    success = $false
    slideCount = 0
    slides = @()
    error = ""
}

if (-not (Test-Path -LiteralPath $PptxPath)) {
    $result.error = "File PowerPoint khong ton tai: $PptxPath"
    $result | ConvertTo-Json -Compress
    exit 1
}

# Dam bao thu muc output ton tai
if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$resolvedPptx = (Resolve-Path -LiteralPath $PptxPath).Path
$resolvedOut = (Resolve-Path -LiteralPath $OutputDir).Path

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

    # 3. Xuat tat ca slide thanh anh PNG (18 = ppSaveAsPNG)
    # PowerPoint se tao ra cac file Slide1.PNG, Slide2.PNG,... ben trong $resolvedOut
    $presentation.SaveAs($resolvedOut, 18)

    # 4. Thu thap danh sach file slide thuc te da xuat
    $slideList = @()
    for ($i = 1; $i -le $slideCount; $i++) {
        # PowerPoint thuong dat ten Slide1.PNG hoac Slide1.png hoac Slide 1.PNG
        $pattern = "Slide$i.PNG"
        $foundFile = Get-ChildItem -LiteralPath $resolvedOut -Filter "Slide$i.*" -File | Select-Object -First 1
        
        if ($foundFile) {
            $slideList += @{
                index = $i - 1
                fileName = $foundFile.Name
                title = "Slide $i"
                sizeBytes = $foundFile.Length
            }
        } else {
            # Thu tim theo dinh dang tieng Viet hoac Slide $i
            $altFile = Get-ChildItem -LiteralPath $resolvedOut -File | Where-Object { $_.BaseName -match "Slide\s*$i$" -or $_.BaseName -match "Slide$i$" } | Select-Object -First 1
            if ($altFile) {
                $slideList += @{
                    index = $i - 1
                    fileName = $altFile.Name
                    title = "Slide $i"
                    sizeBytes = $altFile.Length
                }
            } else {
                $slideList += @{
                    index = $i - 1
                    fileName = "Slide$i.PNG"
                    title = "Slide $i"
                    sizeBytes = 0
                }
            }
        }
    }

    $result.slides = $slideList
    $result.success = $true
}
catch {
    $result.error = $_.Exception.Message
    $result.success = $false
}
finally {
    if ($presentation -ne $null) {
        try { $presentation.Close() } catch {}
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($presentation) | Out-Null
    }
    if ($ppt -ne $null) {
        try { $ppt.Quit() } catch {}
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}

$result | ConvertTo-Json -Compress -Depth 4
