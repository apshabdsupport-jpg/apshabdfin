Add-Type -AssemblyName System.Drawing

$W = 1080
$H = 1350
$Cream = [System.Drawing.Color]::FromArgb(244, 235, 216)
$Black = [System.Drawing.Color]::FromArgb(14, 20, 17)
$Red = [System.Drawing.Color]::FromArgb(236, 57, 52)
$Blue = [System.Drawing.Color]::FromArgb(28, 69, 136)
$White = [System.Drawing.Color]::FromArgb(252, 248, 239)

$Root = 'C:\Users\LENOVO\OneDrive\Aryan\side\PDS'
$Out = Join-Path $Root 'creative\generated-output\social\apshabd-trend-jack-static-v2-2026-09-02'
New-Item -ItemType Directory -Path $Out -Force | Out-Null

$Logo = Join-Path $Root 'assets\brand\apshabd-wordmark-cream.png'
$Musician = Join-Path $Root 'assets\campaign\models\set2-02-chennai-mylapore-musician.jpg'
$MumbaiHorn = Join-Path $Root 'assets\campaign\recreated-city-tees-set-2\06-mumbai-dadar-horn-player.png'
$Dadar = Join-Path $Root 'assets\campaign\models\set1-01-mumbai-dadar.jpg'

function New-Canvas {
    param([System.Drawing.Color]$Background = $Cream)
    $bitmap = New-Object System.Drawing.Bitmap($W, $H)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.Clear($Background)
    return @($bitmap, $graphics)
}

function Brush([System.Drawing.Color]$Color) {
    return New-Object System.Drawing.SolidBrush($Color)
}

function Font {
    param([string]$Family, [float]$Size, [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular)
    return New-Object System.Drawing.Font($Family, $Size, $Style, [System.Drawing.GraphicsUnit]::Pixel)
}

function Draw-Text {
    param(
        [System.Drawing.Graphics]$G,
        [string]$Text,
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [string]$Family = 'Bahnschrift',
        [float]$Size = 48,
        [System.Drawing.Color]$Color = $Black,
        [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular,
        [System.Drawing.StringAlignment]$Align = [System.Drawing.StringAlignment]::Near,
        [System.Drawing.StringAlignment]$VAlign = [System.Drawing.StringAlignment]::Near
    )
    $font = Font $Family $Size $Style
    $brush = Brush $Color
    $format = New-Object System.Drawing.StringFormat([System.Drawing.StringFormatFlags]::NoClip)
    $format.Alignment = $Align
    $format.LineAlignment = $VAlign
    $format.Trimming = [System.Drawing.StringTrimming]::None
    $rect = New-Object System.Drawing.RectangleF($X, $Y, $Width, $Height)
    $G.DrawString($Text, $font, $brush, $rect, $format)
    $format.Dispose(); $brush.Dispose(); $font.Dispose()
}

function Draw-Line {
    param([System.Drawing.Graphics]$G, [float]$X1, [float]$Y1, [float]$X2, [float]$Y2, [System.Drawing.Color]$Color = $Black, [float]$Thickness = 3)
    $pen = New-Object System.Drawing.Pen($Color, $Thickness)
    $G.DrawLine($pen, $X1, $Y1, $X2, $Y2)
    $pen.Dispose()
}

function Fill-Rect {
    param([System.Drawing.Graphics]$G, [float]$X, [float]$Y, [float]$Width, [float]$Height, [System.Drawing.Color]$Color)
    $brush = Brush $Color
    $G.FillRectangle($brush, $X, $Y, $Width, $Height)
    $brush.Dispose()
}

function Draw-ImageCover {
    param([System.Drawing.Graphics]$G, [string]$Path, [int]$X, [int]$Y, [int]$Width, [int]$Height)
    $img = [System.Drawing.Image]::FromFile($Path)
    $targetRatio = $Width / $Height
    $sourceRatio = $img.Width / $img.Height
    if ($sourceRatio -gt $targetRatio) {
        $cropH = $img.Height
        $cropW = [int]($cropH * $targetRatio)
        $cropX = [int](($img.Width - $cropW) / 2)
        $cropY = 0
    } else {
        $cropW = $img.Width
        $cropH = [int]($cropW / $targetRatio)
        $cropX = 0
        $cropY = [int](($img.Height - $cropH) / 2)
    }
    $src = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
    $dst = New-Object System.Drawing.Rectangle($X, $Y, $Width, $Height)
    $G.DrawImage($img, $dst, $src, [System.Drawing.GraphicsUnit]::Pixel)
    $img.Dispose()
}

function Draw-Topbar {
    param([System.Drawing.Graphics]$G, [string]$Label, [string]$Number, [System.Drawing.Color]$Color = $Black)
    Draw-Text $G $Label 72 42 760 45 'Bahnschrift SemiBold' 26 $Color
    Draw-Text -G $G -Text $Number -X 860 -Y 42 -Width 148 -Height 45 -Family 'Bahnschrift SemiBold' -Size 26 -Color $Color -Align ([System.Drawing.StringAlignment]::Far)
    Draw-Line $G 72 96 1008 96 $Color 3
}

function Draw-Footer {
    param([System.Drawing.Graphics]$G, [string]$Line)
    Fill-Rect $G 0 1224 1080 126 $Black
    $footerSize = if ($Line.Length -gt 50) { 19 } elseif ($Line.Length -gt 40) { 21 } elseif ($Line.Length -gt 32) { 23 } else { 26 }
    Draw-Text $G $Line 72 1262 680 42 'Bahnschrift' $footerSize $Cream
    $img = [System.Drawing.Image]::FromFile($Logo)
    $logoW = 205
    $logoH = [int]($img.Height * ($logoW / $img.Width))
    $G.DrawImage($img, 803, 1254, $logoW, $logoH)
    $img.Dispose()
}

function Save-Canvas {
    param([System.Drawing.Bitmap]$Bitmap, [System.Drawing.Graphics]$Graphics, [string]$Name)
    $path = Join-Path $Out $Name
    $Graphics.Dispose()
    $Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $Bitmap.Dispose()
}

# 01 / RAAJA
$pair = New-Canvas; $b = $pair[0]; $g = $pair[1]
Draw-Topbar $g 'APSHABD / CHENNAI' '01 / 06'
Draw-Text $g '83.' 72 122 400 190 'Franklin Gothic Heavy' 168 $Red
Draw-Text $g "STILL MAKING YOUR`nPLAYLIST LOOK LAZY." 72 310 936 250 'Franklin Gothic Heavy' 82 $Black
Fill-Rect $g 72 560 936 62 $Red
Draw-Text $g 'MUTHUMANI ON REPEAT. CHENNAI, OBVIOUSLY.' 94 574 892 38 'Bahnschrift SemiBold' 27 $White
Draw-ImageCover $g $Musician 72 650 936 544
Draw-Footer $g 'RAAJA: 1. ALGORITHM: 0.'
Save-Canvas $b $g '01-raaja-chennai-v2.png'

# 02 / INDIA WOMEN
$pair = New-Canvas; $b = $pair[0]; $g = $pair[1]
Draw-Topbar $g 'APSHABD / SCOREBOARD' '02 / 06'
Draw-Text $g "INDIA WON BY`n94 RUNS." 72 136 936 245 'Franklin Gothic Heavy' 110 $Black
Fill-Rect $g 72 420 936 110 $Red
Draw-Text $g 'BIT RUDE, HONESTLY.' 96 438 888 78 'Franklin Gothic Heavy' 58 $White
Draw-Text $g '64' 72 585 410 240 'Franklin Gothic Heavy' 190 $Blue
Draw-Text -G $g -Text '65' -X 598 -Y 585 -Width 410 -Height 240 -Family 'Franklin Gothic Heavy' -Size 190 -Color $Black -Align ([System.Drawing.StringAlignment]::Far)
Draw-Text $g 'SHAFALI' 72 820 410 50 'Bahnschrift SemiBold' 30 $Blue
Draw-Text -G $g -Text 'THAILAND' -X 598 -Y 820 -Width 410 -Height 50 -Family 'Bahnschrift SemiBold' -Size 30 -Color $Black -Align ([System.Drawing.StringAlignment]::Far)
Draw-Line $g 72 900 1008 900 $Black 4
Draw-Text $g "ONE BATTER FINISHED`nONE RUN SHORT OF`nTHEIR ENTIRE TEAM." 72 930 936 235 'Franklin Gothic Heavy' 67 $Black
Draw-Footer $g 'GOOD MORNING TO EVERYONE EXCEPT THE SCOREBOARD.'
Save-Canvas $b $g '02-india-women-94-runs-v2.png'

# 03 / GANPATI
$pair = New-Canvas; $b = $pair[0]; $g = $pair[1]
Draw-ImageCover $g $MumbaiHorn 0 0 1080 1350
$overlay = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(225, 14, 20, 17))
$g.FillRectangle($overlay, 0, 0, 1080, 660); $overlay.Dispose()
Draw-Topbar $g 'APSHABD / MUMBAI' '03 / 06' $Cream
Draw-Text $g "MUMBAI IS`nREHEARSING FOR A`n10-DAY VOLUME`nPROBLEM." 72 135 936 420 'Franklin Gothic Heavy' 77 $Cream
Fill-Rect $g 72 575 430 64 $Red
Draw-Text $g 'BAPPA ARRIVES 14.09.26' 92 590 390 38 'Bahnschrift SemiBold' 25 $White
Draw-Footer $g 'THE NEIGHBOURS HAVE BEEN WARNED.'
Save-Canvas $b $g '03-mumbai-bappa-v2.png'

# 04 / PINCODE
$pair = New-Canvas; $b = $pair[0]; $g = $pair[1]
Draw-Topbar $g 'APSHABD / DROP A PIN' '04 / 06'
Draw-Text $g '400___' 72 130 936 160 'Bahnschrift SemiBold' 126 ([System.Drawing.Color]::FromArgb(200, 207, 194, 169))
Draw-Text $g "YOUR PINCODE HAS`nMORE PERSONALITY`nTHAN MOST BRAND`nMANIFESTOS." 72 275 936 520 'Franklin Gothic Heavy' 82 $Black
Fill-Rect $g 72 830 936 10 $Red
Draw-Text $g "YES, WE SEE THE IRONY.`nMOVING ON." 72 880 936 150 'Franklin Gothic Heavy' 58 $Red
Draw-Text $g "WEAR WHERE YOU'RE FROM." 72 1095 936 52 'Bahnschrift SemiBold' 32 $Black
Draw-Footer $g 'COMMENTS ARE OPEN. PINCODE WARS ARE INEVITABLE.'
Save-Canvas $b $g '04-local-pincode-v2.png'

# 05 / WARNING
$pair = New-Canvas; $b = $pair[0]; $g = $pair[1]
Draw-Topbar $g 'APSHABD / PUBLIC NOTICE' '05 / 06'
Draw-Text $g 'WARNING:' 72 125 936 170 'Franklin Gothic Heavy' 140 $Red
Draw-Text $g "MAY START AN`nUNNECESSARY`nARGUMENT ABOUT`nWHICH AREA IS`nBETTER." 72 300 936 585 'Franklin Gothic Heavy' 82 $Black
Fill-Rect $g 72 930 936 4 $Black
Draw-Text $g "SIDE EFFECTS INCLUDE CORRECTING PRONUNCIATIONS`nAND GIVING DIRECTIONS VIA A SHOP THAT SHUT IN 2019." 72 965 936 125 'Bahnschrift SemiBold' 29 $Black
Fill-Rect $g 72 1120 422 62 $Red
Draw-Text $g 'READ BEFORE WEARING.' 92 1135 385 36 'Bahnschrift SemiBold' 25 $White
Draw-Footer $g 'APSHABD ACCEPTS NO RESPONSIBILITY FOR AREA BEEF.'
Save-Canvas $b $g '05-warning-city-pride-v2.png'

# 06 / 2016
$pair = New-Canvas; $b = $pair[0]; $g = $pair[1]
Draw-Topbar $g 'APSHABD / CAMERA ROLL' '06 / 06'
Draw-Text $g "2016 LOOKED BETTER`nAT 8 MEGAPIXELS." 72 132 936 220 'Franklin Gothic Heavy' 72 $Black
Draw-ImageCover $g $Dadar 72 380 936 650
$borderPen = New-Object System.Drawing.Pen($Black, 8); $g.DrawRectangle($borderPen, 72, 380, 936, 650); $borderPen.Dispose()
Draw-Text $g "BAD PHOTOS. GREAT PLANS.`nZERO CONTENT STRATEGY." 72 1065 936 120 'Franklin Gothic Heavy' 46 $Red
Draw-Footer $g 'POSTED FROM A PHONE WITH 12% BATTERY.'
Save-Canvas $b $g '06-2016-called-v2.png'

Get-ChildItem -LiteralPath $Out -Filter '*.png' | Select-Object Name, Length, FullName
