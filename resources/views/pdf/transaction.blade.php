<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Transaction {{ $transaction->id }}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;400;600;700&display=swap');
        
        @page { margin: 0px; }
        body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            background-color: #ffffff; 
            color: #1e1e1e; 
        }

        .main-container { padding-top: 360px; padding-left: 60px; padding-right: 60px; }
        .table-pill { background-color: #9767b8; border-radius: 20px; color: white; padding: 10px 20px; font-size: 13px; font-weight: normal; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 25px; margin-bottom: 60px; }
        .data-table td { border-bottom: 1px solid #111; padding: 15px 20px; font-size: 13px; color: #1e1e1e; }
        .data-table .empty-row td { padding: 25px 20px; }
    </style>
</head>
<body>

    @php
    $bgSvg = '<svg width="794" height="1123" viewBox="0 0 794 1123" xmlns="http://www.w3.org/2000/svg">
        <rect width="794" height="1123" fill="#e3ebf4"/>
        
        <!-- Top Dark Echo (Starts transition at 350, ends at 510) -->
        <path d="M 0 0 L 794 0 L 794 30 L 510 30 C 430 30 430 130 350 130 L 0 130 Z" fill="#5b377a"/>
        <!-- Top Light Wave (Starts transition at 320, ends at 480) -> Longer 20% transition -->
        <path d="M 0 0 L 794 0 L 794 30 L 480 30 C 400 30 400 130 320 130 L 0 130 Z" fill="#9767b8"/>
        
        <!-- Perfect smooth semi-circles -->
        <path d="M 0 250 C 35 250 50 270 50 300 C 50 330 35 350 0 350 Z" fill="#9767b8"/>
        <path d="M 794 650 C 759 650 744 670 744 700 C 744 730 759 750 794 750 Z" fill="#9767b8"/>
        <path d="M 794 800 C 759 800 744 820 744 850 C 744 880 759 900 794 900 Z" fill="#9767b8"/>

        <!-- Bottom Dark Echo (Starts transition at 450, ends at 290) -->
        <path d="M 0 1123 L 794 1123 L 794 1000 L 450 1000 C 370 1000 370 1090 290 1090 L 0 1090 Z" fill="#5b377a"/>
        <!-- Bottom Light Wave (Starts transition at 480, ends at 320) -> Shorter height, 6 lanes on right -->
        <path d="M 0 1123 L 794 1123 L 794 1000 L 480 1000 C 400 1000 400 1090 320 1090 L 0 1090 Z" fill="#9767b8"/>
    </svg>';
    $bgSvgEnc = base64_encode($bgSvg);

    $logoSvg = '<svg viewBox="0 0 60 80" width="90" height="110" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 5 C15 5, 5 15, 5 35 C5 55, 15 75, 30 75 C45 75, 55 55, 55 35 C55 15, 45 5, 30 5 Z" fill="none" stroke="#5b377a" stroke-width="2"/>
        <path d="M 12 35 C 12 40, 25 40, 25 35 C 25 30, 12 30, 12 35 Z" fill="none" stroke="#5b377a" stroke-width="2"/>
        <path d="M 35 35 C 35 40, 48 40, 48 35 C 35 30, 48 30, 35 35 Z" fill="none" stroke="#5b377a" stroke-width="2"/>
        <path d="M 25 35 L 35 35" fill="none" stroke="#5b377a" stroke-width="2"/>
        <path d="M 10 20 C 5 10, 20 -5, 30 5 C 40 -5, 55 10, 50 20 C 60 30, 45 40, 45 35 C 45 25, 15 25, 15 35 C 15 40, 0 30, 10 20 Z" fill="#5b377a"/>
    </svg>';
    $logoSvgEnc = base64_encode($logoSvg);

    $arrowsSvg = '<svg width="400" height="20" xmlns="http://www.w3.org/2000/svg">';
    for($i=0; $i<16; $i++) {
        $arrowsSvg .= '<polygon points="'.($i*24).',4 '.($i*24 + 10).',10 '.($i*24).',16" fill="none" stroke="#5b377a" stroke-width="2"/>';
    }
    $arrowsSvg .= '</svg>';
    $arrowsSvgEnc = base64_encode($arrowsSvg);
    @endphp

    <img src="data:image/svg+xml;base64,{{ $bgSvgEnc }}" style="position: absolute; top:0; left:0; width:794px; height:1123px; z-index: -100;" />

    <!-- Vector Logo encoded as Base64 Image guaranteed to show -->
    <div style="position: absolute; top: 40px; left: 45px; width: 80px;">
        <img src="data:image/svg+xml;base64,{{ $logoSvgEnc }}" width="80" alt="Logo">
    </div>
    
    <!-- Adjusted name text and weight -->
    <div style="position: absolute; top: 60px; left: 140px; font-size: 26px; color: #5b377a; letter-spacing: -0.5px; font-weight: 200; line-height: 0.9;">
        NOUR ABO<br>ELSOUD
    </div>

    <!-- Font thickness bumped to 200 -->
    <div style="position: absolute; top: 85px; right: 50px; font-size: 50px; color: #5b377a; letter-spacing: 4px; font-weight: 200;">
        TRANSACTION
    </div>

    <!-- Arrows rendered perfectly via absolute base64 images -->
    <div style="position: absolute; top: 185px; left: 70px;">
        <img src="data:image/svg+xml;base64,{{ $arrowsSvgEnc }}" width="400" />
    </div>

    <!-- Box horizontally wider, less rounded edge (8px), pure white solid text -->
    <div style="position: absolute; top: 175px; right: 0; width: 320px; background-color: #9767b8; border-top-left-radius: 8px; border-bottom-left-radius: 8px; padding: 12px 14px; color: #ffffff; font-size: 15px;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td width="55%" style="font-weight: 600; color: #ffffff;">ID: #{{ $transaction->id }}</td>
                <td width="45%" align="right" style="font-weight: 600; color: #ffffff;">{{ $transaction->occurred_date?->format('d/m/Y') ?? 'N/A' }}</td>
            </tr>
        </table>
    </div>

    <div style="position: absolute; top: 250px; left: 70px;">
        <div style="font-size: 13px; color: #333; font-weight: bold;">Project:</div>
        <div style="font-size: 14px; color: #1e1e1e; margin-top: 8px; margin-left: 15px; font-weight: bold;">
            {{ $transaction->project->name ?? '—' }}
        </div>
    </div>

    <div class="main-container">
        
        <div class="table-pill">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td width="70%" style="padding-left:0;">Description</td>
                    <td width="30%" align="left">Amount</td>
                </tr>
            </table>
        </div>

        <table class="data-table" cellpadding="0" cellspacing="0">
            <tr>
                <td width="70%" style="padding-top: 30px;">
                    {{ $transaction->description }}<br>
                    @if($transaction->category)
                    <span style="font-size: 11px; color:#555;">Category: {{ $transaction->category }}</span>
                    @endif
                </td>
                @php
                    $amount = (float) $transaction->amount;
                    $currency = strtoupper($transaction->currency ?? 'EGP');
                    if(in_array($currency, ['USD'])) { $amountTpl = '$'.number_format(abs($amount)); } else { $amountTpl = abs($amount).' '.$currency; }
                    $sign = $amount < 0 ? '-' : '';
                @endphp
                <td width="30%" align="left" style="padding-top: 30px;">{{ $sign }}{{ $amountTpl }}</td>
            </tr>
            @for($i=0; $i<5; $i++)
            <tr class="empty-row">
                <td colspan="2">&nbsp;</td>
            </tr>
            @endfor
        </table>

        <!-- Broken Line Link / URL -->
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td width="65%" valign="top">
                    <!-- Text on one line, URL underneath padded to right -->
                    <div style="font-size:12px; color:#444; margin-bottom:5px; font-weight: bold;">Record URL :</div>
                    <div style="font-size:12px; color:#5b377a; padding-left: 20px;">{{ url('/finance/transactions/'.$transaction->id) }}</div>
                </td>
                <td width="35%" valign="top" style="padding-left: 30px;">
                    <div style="font-size:13px; color:#444; margin-bottom:5px;">Total:</div>
                    <div style="font-size:14px; font-weight: bold; color:#5b377a;">{{ $sign }}{{ $amountTpl }}</div>
                </td>
            </tr>
        </table>
        
        <div style="margin-top: 70px; width: 0;"></div>
    </div>
    
    <div style="position: absolute; bottom: 80px; left: 60px;">
        <div style="border-bottom: 1px solid #1e1e1e; width: 220px;"></div>
        <div style="margin-top: 15px; font-weight: 200; font-size: 15px; color:#5b377a;">Nour Abo Elsoud</div>
    </div>

    <!-- Absolute Footer Info -->
    <div style="position: absolute; bottom: 50px; right: 60px; text-align: right; color: #fff; font-size: 11px; line-height: 1.8;">
        01127860029<br>
        https://nouraboelsoud.com
    </div>

</body>
</html>
