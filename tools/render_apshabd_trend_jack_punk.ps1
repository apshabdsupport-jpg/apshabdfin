Add-Type -AssemblyName System.Drawing

$W = 1080; $H = 1350
$Cream = [System.Drawing.Color]::FromArgb(244,235,216)
$Black = [System.Drawing.Color]::FromArgb(12,16,14)
$Red = [System.Drawing.Color]::FromArgb(236,57,52)
$Blue = [System.Drawing.Color]::FromArgb(35,74,143)
$White = [System.Drawing.Color]::FromArgb(252,248,239)
$Tape = [System.Drawing.Color]::FromArgb(178,221,202,157)

$Root = 'C:\Users\LENOVO\OneDrive\Aryan\side\PDS'
$Out = Join-Path $Root 'creative\generated-output\social\apshabd-trend-jack-punk-2026-09-02'
$PlateDir = Join-Path $Out 'source-plates'
New-Item -ItemType Directory -Path $Out -Force | Out-Null

$PaperPlate = Join-Path $PlateDir 'punk-paper-plate.png'
$MusicPlate = Join-Path $PlateDir 'punk-music-plate.png'
$FormPlate = Join-Path $PlateDir 'punk-form-plate.png'
$Logo = Join-Path $Root 'assets\brand\apshabd-wordmark-cream.png'
$Musician = Join-Path $Root 'assets\campaign\models\set2-02-chennai-mylapore-musician.jpg'
$MumbaiHorn = Join-Path $Root 'assets\campaign\recreated-city-tees-set-2\06-mumbai-dadar-horn-player.png'
$Dadar = Join-Path $Root 'assets\campaign\models\set1-01-mumbai-dadar.jpg'

function Solid([System.Drawing.Color]$Color) { New-Object System.Drawing.SolidBrush($Color) }
function Make-Font([string]$Family,[float]$Size,[System.Drawing.FontStyle]$Style=[System.Drawing.FontStyle]::Regular) {
    New-Object System.Drawing.Font($Family,$Size,$Style,[System.Drawing.GraphicsUnit]::Pixel)
}

function Draw-Cover {
    param([System.Drawing.Graphics]$G,[string]$Path,[int]$X,[int]$Y,[int]$Width,[int]$Height)
    $img=[System.Drawing.Image]::FromFile($Path)
    $target=$Width/$Height; $source=$img.Width/$img.Height
    if($source -gt $target){$ch=$img.Height;$cw=[int]($ch*$target);$cx=[int](($img.Width-$cw)/2);$cy=0}
    else{$cw=$img.Width;$ch=[int]($cw/$target);$cx=0;$cy=[int](($img.Height-$ch)/2)}
    $src=New-Object System.Drawing.Rectangle($cx,$cy,$cw,$ch)
    $dst=New-Object System.Drawing.Rectangle($X,$Y,$Width,$Height)
    $G.DrawImage($img,$dst,$src,[System.Drawing.GraphicsUnit]::Pixel)
    $img.Dispose()
}

function New-Poster([string]$Plate) {
    $b=New-Object System.Drawing.Bitmap($W,$H)
    $g=[System.Drawing.Graphics]::FromImage($b)
    $g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    Draw-Cover $g $Plate 0 0 $W $H
    @($b,$g)
}

function Draw-TextBox {
    param([System.Drawing.Graphics]$G,[string]$Text,[float]$X,[float]$Y,[float]$Width,[float]$Height,[string]$Family,[float]$Size,[System.Drawing.Color]$Color,[System.Drawing.StringAlignment]$Align=[System.Drawing.StringAlignment]::Near)
    $font=Make-Font $Family $Size
    $brush=Solid $Color
    $format=New-Object System.Drawing.StringFormat(([System.Drawing.StringFormatFlags]::NoClip -bor [System.Drawing.StringFormatFlags]::NoWrap))
    $format.Alignment=$Align; $format.LineAlignment=[System.Drawing.StringAlignment]::Center
    $rect=New-Object System.Drawing.RectangleF($X,$Y,$Width,$Height)
    $G.DrawString($Text,$font,$brush,$rect,$format)
    $format.Dispose();$brush.Dispose();$font.Dispose()
}

function Draw-Strip {
    param([System.Drawing.Graphics]$G,[string]$Text,[float]$X,[float]$Y,[float]$Width,[float]$Height,[float]$Angle,[System.Drawing.Color]$Background,[System.Drawing.Color]$Foreground,[float]$Size,[string]$Family='Franklin Gothic Heavy')
    $state=$G.Save()
    $G.TranslateTransform($X+$Width/2,$Y+$Height/2)
    $G.RotateTransform($Angle)
    $brush=Solid $Background
    $G.FillRectangle($brush,-$Width/2,-$Height/2,$Width,$Height)
    $brush.Dispose()
    Draw-TextBox $G $Text (-$Width/2+18) (-$Height/2) ($Width-36) $Height $Family $Size $Foreground
    $G.Restore($state)
}

function Draw-Tape {
    param([System.Drawing.Graphics]$G,[float]$X,[float]$Y,[float]$Width,[float]$Height,[float]$Angle)
    $state=$G.Save();$G.TranslateTransform($X+$Width/2,$Y+$Height/2);$G.RotateTransform($Angle)
    $brush=Solid $Tape;$G.FillRectangle($brush,-$Width/2,-$Height/2,$Width,$Height);$brush.Dispose();$G.Restore($state)
}

function Draw-PhotoCard {
    param([System.Drawing.Graphics]$G,[string]$Path,[float]$X,[float]$Y,[float]$Width,[float]$Height,[float]$Angle)
    $card=New-Object System.Drawing.Bitmap([int]$Width,[int]$Height)
    $cg=[System.Drawing.Graphics]::FromImage($card)
    $cg.Clear($Black);$cg.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    Draw-Cover $cg $Path 12 12 ([int]$Width-24) ([int]$Height-24)
    $wash=Solid ([System.Drawing.Color]::FromArgb(35,244,235,216));$cg.FillRectangle($wash,12,12,$Width-24,$Height-24);$wash.Dispose();$cg.Dispose()
    $state=$G.Save();$G.TranslateTransform($X+$Width/2,$Y+$Height/2);$G.RotateTransform($Angle)
    $G.DrawImage($card,-$Width/2,-$Height/2,$Width,$Height);$G.Restore($state);$card.Dispose()
    Draw-Tape $G ($X+$Width*0.35) ($Y-12) 170 46 ($Angle-4)
}

function Draw-Header {
    param([System.Drawing.Graphics]$G,[string]$Label,[string]$Number)
    Draw-Strip $G $Label 56 36 450 54 -1.2 $Black $Cream 25 'Bahnschrift SemiBold'
    Draw-Strip $G $Number 862 38 150 50 2 $Red $White 24 'Bahnschrift SemiBold'
}

function Draw-Footer {
    param([System.Drawing.Graphics]$G,[string]$Line)
    Draw-Strip $G $Line 44 1242 690 58 -1 $Black $Cream 22 'Bahnschrift SemiBold'
    $img=[System.Drawing.Image]::FromFile($Logo)
    $lw=205;$lh=[int]($img.Height*($lw/$img.Width))
    $state=$G.Save();$G.TranslateTransform(900,1278);$G.RotateTransform(1.5);$G.DrawImage($img,-$lw/2,-$lh/2,$lw,$lh);$G.Restore($state);$img.Dispose()
}

function Save-Poster([System.Drawing.Bitmap]$B,[System.Drawing.Graphics]$G,[string]$Name){$G.Dispose();$B.Save((Join-Path $Out $Name),[System.Drawing.Imaging.ImageFormat]::Png);$B.Dispose()}

# 01 RAAJA / MUSIC ZINE
$p=New-Poster $MusicPlate;$b=$p[0];$g=$p[1]
Draw-Header $g 'APSHABD / CHENNAI' '01 / 06'
Draw-PhotoCard $g $Musician 540 330 465 700 4
Draw-Strip $g '83.' 58 145 300 190 -4 $Red $White 145
Draw-Strip $g 'STILL MAKING YOUR' 54 360 700 92 1.5 $Cream $Black 54
Draw-Strip $g 'PLAYLIST LOOK LAZY.' 40 465 690 100 -1.8 $Black $Cream 59
Draw-Strip $g 'MUTHUMANI ON REPEAT.' 72 590 420 60 2 $Red $White 27 'Bahnschrift SemiBold'
Draw-Strip $g 'CHENNAI, OBVIOUSLY.' 92 660 400 58 -2 $Cream $Black 25 'Bahnschrift SemiBold'
Draw-Footer $g 'RAAJA: 1. ALGORITHM: 0.'
Save-Poster $b $g '01-raaja-chennai-punk.png'

# 02 INDIA WOMEN / SCOREBOARD FLYER
$p=New-Poster $PaperPlate;$b=$p[0];$g=$p[1]
Draw-Header $g 'APSHABD / SCOREBOARD' '02 / 06'
Draw-Strip $g 'INDIA WON BY' 70 145 650 105 -1.5 $Cream $Black 78
Draw-Strip $g '94 RUNS.' 320 258 660 150 2.4 $Red $White 112
Draw-Strip $g 'BIT RUDE, HONESTLY.' 88 430 690 88 -2 $Black $Cream 56
Draw-Strip $g '64' 105 570 350 265 -3 $Blue $White 165
Draw-Strip $g '65' 630 565 350 265 3 $Black $Cream 165
Draw-Strip $g 'SHAFALI' 120 850 300 54 1 $Cream $Blue 28 'Bahnschrift SemiBold'
Draw-Strip $g 'THAILAND' 665 850 300 54 -1 $Cream $Black 28 'Bahnschrift SemiBold'
Draw-Strip $g 'ONE RUN SHORT OF THEIR ENTIRE TEAM.' 55 950 970 92 1 $Black $Cream 39
Draw-Footer $g 'GOOD MORNING TO EVERYONE EXCEPT THE SCOREBOARD.'
Save-Poster $b $g '02-india-women-94-runs-punk.png'

# 03 MUMBAI / GIG FLYER
$p=New-Poster $MusicPlate;$b=$p[0];$g=$p[1]
Draw-Header $g 'APSHABD / MUMBAI' '03 / 06'
Draw-PhotoCard $g $MumbaiHorn 475 405 540 690 -3
Draw-Strip $g 'MUMBAI IS' 50 150 500 90 -2 $Red $White 67
Draw-Strip $g 'REHEARSING FOR A' 58 245 650 90 1 $Cream $Black 61
Draw-Strip $g '10-DAY VOLUME' 45 340 590 90 -1.5 $Black $Cream 62
Draw-Strip $g 'PROBLEM.' 68 438 400 100 2 $Red $White 71
Draw-Strip $g 'BAPPA ARRIVES 14.09.26' 92 575 440 62 -2 $Cream $Black 25 'Bahnschrift SemiBold'
Draw-Footer $g 'THE NEIGHBOURS HAVE BEEN WARNED.'
Save-Poster $b $g '03-mumbai-bappa-punk.png'

# 04 PINCODE / MUNICIPAL ZINE
$p=New-Poster $FormPlate;$b=$p[0];$g=$p[1]
Draw-Header $g 'APSHABD / DROP A PIN' '04 / 06'
Draw-Strip $g '400___' 560 125 410 145 3 $Red $White 110
Draw-Strip $g 'YOUR PINCODE HAS' 62 290 680 92 -1 $Black $Cream 62
Draw-Strip $g 'MORE PERSONALITY' 115 390 770 92 2 $Cream $Black 61
Draw-Strip $g 'THAN MOST BRAND' 45 492 650 92 -2 $Red $White 60
Draw-Strip $g 'MANIFESTOS.' 175 594 590 105 1.5 $Black $Cream 72
Draw-Strip $g 'YES, WE SEE THE IRONY.' 82 760 560 65 -2 $Cream $Red 35
Draw-Strip $g 'MOVING ON.' 540 842 360 80 3 $Red $White 49
Draw-Strip $g "WEAR WHERE YOU'RE FROM." 110 1015 650 66 -1 $Black $Cream 33 'Bahnschrift SemiBold'
Draw-Footer $g 'COMMENTS OPEN. PINCODE WARS INEVITABLE.'
Save-Poster $b $g '04-local-pincode-punk.png'

# 05 WARNING / PUBLIC NOTICE
$p=New-Poster $FormPlate;$b=$p[0];$g=$p[1]
Draw-Header $g 'APSHABD / PUBLIC NOTICE' '05 / 06'
Draw-Strip $g 'WARNING:' 58 145 760 150 -3 $Red $White 120
Draw-Strip $g 'MAY START AN' 110 315 620 90 1.5 $Black $Cream 68
Draw-Strip $g 'UNNECESSARY' 62 415 650 95 -1 $Cream $Black 72
Draw-Strip $g 'ARGUMENT ABOUT' 235 520 730 96 2 $Red $White 66
Draw-Strip $g 'WHICH AREA IS' 66 628 630 92 -2 $Black $Cream 66
Draw-Strip $g 'BETTER.' 440 730 430 118 3 $Red $White 89
Draw-Strip $g 'SIDE EFFECT: CORRECTING PRONUNCIATIONS.' 72 905 870 64 -1 $Cream $Black 28 'Bahnschrift SemiBold'
Draw-Strip $g 'ALSO: DIRECTIONS VIA A SHOP THAT SHUT IN 2019.' 110 985 870 64 1.5 $Black $Cream 25 'Bahnschrift SemiBold'
Draw-Footer $g 'APSHABD ACCEPTS NO RESPONSIBILITY FOR AREA BEEF.'
Save-Poster $b $g '05-warning-city-pride-punk.png'

# 06 CAMERA ROLL / SCRAPBOOK ZINE
$p=New-Poster $PaperPlate;$b=$p[0];$g=$p[1]
Draw-Header $g 'APSHABD / CAMERA ROLL' '06 / 06'
Draw-PhotoCard $g $Dadar 110 380 860 650 2.5
Draw-Strip $g '2016 LOOKED BETTER' 54 145 760 92 -1.5 $Black $Cream 63
Draw-Strip $g 'AT 8 MEGAPIXELS.' 250 248 700 100 2 $Red $White 68
Draw-Strip $g 'BAD PHOTOS.' 72 1050 420 70 -2 $Cream $Black 43
Draw-Strip $g 'GREAT PLANS.' 445 1100 420 70 2 $Red $White 43
Draw-Strip $g 'ZERO CONTENT STRATEGY.' 125 1170 700 66 -1 $Black $Cream 39
Draw-Footer $g 'POSTED FROM A PHONE WITH 12% BATTERY.'
Save-Poster $b $g '06-2016-called-punk.png'

Get-ChildItem -LiteralPath $Out -Filter '*-punk.png' | Select-Object Name,Length,FullName
