<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Transaction {{ $transaction->id }}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;600;700&display=swap');
        
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
        
        <!-- Top Dark Echo -->
        <path d="M 0 0 L 794 0 L 794 30 L 520 30 C 338 30 338 130 155 130 L 0 130 Z" fill="#5b377a"/>
        <!-- Top Light Wave -->
        <path d="M 0 0 L 794 0 L 794 30 L 450 30 C 300 30 300 130 150 130 L 0 130 Z" fill="#9767b8"/>
        
        <!-- Top mirrored semicircle drawn as one arc to avoid seam artifacts -->
        <path d="M 0 233 A 40 40 0 0 1 0 313" fill="none" stroke="#9767b8" stroke-width="30" stroke-linecap="round"/>
        <circle cx="794" cy="850" r="40" fill="none" stroke="#9767b8" stroke-width="30"/>

        <!-- Bottom Dark Echo -->
        <path d="M 0 1123 L 794 1123 L 794 993 L 639 993 C 457 993 457 1093 274 1093 L 0 1093 Z" fill="#5b377a"/>
        <!-- Bottom Light Wave -->
        <path d="M 0 1123 L 794 1123 L 794 993 L 644 993 C 494 993 494 1093 344 1093 L 0 1093 Z" fill="#9767b8"/>
    </svg>';
    $bgSvgEnc = base64_encode($bgSvg);

    $logoSvg = '<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128.48 204.88">
  <defs><style>.cls-1 { fill: #5b377a; }</style></defs>
  <g id="logo">
    <path class="cls-1" d="m125.64,64.98c-.43,7.78-1.51,15.66-2.56,23.27-.67,4.88-1.46,9.79-2.75,14.31-.31.19-.63.53-.88,1.11-.52,1.22-4.28,5.73-7.26,9.12-.25-3.45-.46-6.34-.52-7.09v-.07s-.68-4.06-.68-4.06c-.1-1.2-.2-2.4-.32-3.59-.41-4.12-1.07-9.04-2.58-13.86-.74-2.37-1.69-4.71-2.92-6.93-.85-1.54-1.83-2.96-2.89-4.25-1.78-2.15-3.83-3.92-6.02-5.24-2.51-1.51-5.22-2.42-7.93-2.6-1.65-.11-3.37.02-5.03.14-1.24.09-2.45.18-3.6.17-2.29-.01-4.34-.41-5.87-1.93-1.35-1.34-1.99-3.34-2.68-5.45-.45-1.39-.91-2.82-1.6-4.15-.93-1.81-2.16-3.25-3.55-4.41-3.86-3.22-8.93-4.21-12.12-4.5-2.53-.23-5.09-.16-7.6.2-2.79.4-5.54,1.15-8.14,2.25-4,1.69-5.98,5.71-7.43,8.65-.35.72-.69,1.39-1,1.93-1.04,1.79-2.19,3.24-3.31,4.64-2.01,2.52-3.91,4.9-4.9,8.83-.1.41-.2.82-.3,1.22-3,12.1-4.94,22.77-5.87,32.39-.56,5.83-.76,11.27-.59,16.42-.94-1.24-2.23-3.22-3.5-5.36-4.33-8.91-6.39-19.05-8.26-33.05-.85-6.39.49-13.04,1.79-19.47.39-1.92.79-3.9,1.12-5.85,1.14-6.6,2.4-12.36,6.22-16.13l.55-.55-.14-.79c-.95-5.27.73-12.68,3.99-17.62,1.45-2.21,3.91-4.96,7.37-5.54.74-.12,1.49-.2,2.28-.28,1.87-.19,3.8-.38,5.63-1.24,2.47-1.15,4.22-3.22,5.91-5.22.96-1.14,1.87-2.21,2.89-3.11,2.3-2.03,5.29-3.04,8.27-3.04s6.2,1.09,8.54,3.26l.88.82.89-.82c7.6-6.97,20.52-5.99,27.12,2.06l.48.59.73-.11c3.82-.57,7.57,1.34,11.74,3.71,3.14,1.79,6.38,3.63,8.82,6.35,2.57,2.86,3.78,6.41,3.23,9.49l-.11.6,8.45,12.95c2,3.06,4.06,6.22,5.12,9.74,1.15,3.81,1.1,8.05.88,12.06Z"/>
    <g>
      <path class="cls-1" d="m119.64,43.18l-8.45-12.95.11-.6c.55-3.08-.66-6.62-3.23-9.49-2.44-2.72-5.68-4.56-8.82-6.35-4.16-2.37-7.92-4.28-11.74-3.71l-.73.11-.48-.59c-6.6-8.05-19.52-9.03-27.12-2.06l-.89.82-.88-.82c-2.34-2.17-5.44-3.26-8.54-3.26s-5.98,1.01-8.27,3.04c-1.02.9-1.93,1.97-2.89,3.11-1.69,2-3.44,4.07-5.91,5.22-1.84.85-3.77,1.05-5.63,1.24-.79.08-1.54.16-2.28.28-3.46.58-5.92,3.33-7.37,5.54-3.26,4.95-4.94,12.36-3.99,17.62l.14.79-.55.55c-3.82,3.77-5.08,9.53-6.22,16.13-.34,1.95-.74,3.93-1.12,5.85-1.3,6.43-2.64,13.09-1.79,19.47,1.87,14,3.93,24.14,8.26,33.05,1.27,2.13,2.56,4.12,3.5,5.36-.17-5.15.03-10.6.59-16.42.93-9.63,2.87-20.29,5.87-32.39.1-.41.2-.81.3-1.22.99-3.93,2.89-6.31,4.9-8.83,1.12-1.4,2.27-2.84,3.31-4.64.31-.54.65-1.22,1-1.93,1.45-2.94,3.43-6.96,7.43-8.65,2.6-1.1,5.35-1.85,8.14-2.25,2.51-.36,5.06-.43,7.6-.2,3.19.29,8.26,1.28,12.12,4.5,1.39,1.16,2.62,2.6,3.55,4.41.69,1.34,1.15,2.77,1.6,4.15.68,2.11,1.33,4.11,2.68,5.45,1.53,1.52,3.58,1.91,5.87,1.93,1.15,0,2.36-.08,3.6-.17,1.66-.12,3.37-.25,5.03-.14,2.71.18,5.41,1.09,7.93,2.6,2.19,1.32,4.24,3.09,6.02,5.24,1.07,1.29,2.04,2.71,2.89,4.25,1.23,2.21,2.17,4.56,2.92,6.93,1.51,4.82,2.18,9.74,2.58,13.86.12,1.19.22,2.4.32,3.59l.67,4.06v.07c.06.75.28,3.64.53,7.09,2.98-3.4,6.74-7.9,7.26-9.12.25-.59.57-.92.88-1.11,1.3-4.52,2.08-9.43,2.75-14.31,1.04-7.61,2.12-15.48,2.56-23.27.22-4.01.27-8.25-.88-12.06-1.06-3.52-3.12-6.69-5.12-9.74Z"/>
      <path class="cls-1" d="m127.35,52.04c-1.19-3.93-3.37-7.28-5.48-10.51l-7.81-11.97c.46-3.83-1.02-8.05-4.03-11.41-2.74-3.05-6.33-5.09-9.5-6.9-3.37-1.92-7.92-4.51-12.66-4.1-3.61-4.08-8.87-6.65-14.55-7.08-5.54-.42-10.94,1.23-15.02,4.54-5.59-4.38-14.06-4.24-19.43.5-1.17,1.03-2.19,2.24-3.17,3.4-1.57,1.86-3.05,3.61-4.98,4.51-1.44.67-3.07.84-4.8,1.01-.8.08-1.62.16-2.45.3-3.48.58-6.65,2.91-9.17,6.73-3.54,5.38-5.37,13.09-4.56,19.05-4.36,4.74-5.6,11.9-6.51,17.17-.33,1.91-.73,3.87-1.11,5.76-1.35,6.68-2.74,13.59-1.82,20.49,1.56,11.67,3.33,20.97,6.47,29.13-.23.16-.44.36-.62.61-2.08,2.81-.09,11.8.7,14.94-.6,4.99.42,10.15,1.1,12.81.5,1.98,1.8,6.54,3.36,7.45.31.49.7,2.24.93,3.3.26,1.16.53,2.36.87,3.3.57,1.58,1.87,2.66,3.49,2.9.22.03.44.05.66.05.52,0,1.02-.1,1.48-.27.58,4.12,1.14,7.6,1.69,9.11,2.87,7.84,8.23,16.13,15.93,24.64,8.39,9.27,15.99,13.36,25.62,13.36,2.17,0,4.44-.21,6.84-.61,11.22-1.87,20.02-11.93,21.76-14.05,6.54-1.85,12.28-12.43,17.08-31.46.63-2.51,1.21-5.02,1.73-7.46.95.42,1.92.65,2.87.65.71,0,1.41-.12,2.08-.37,1.87-.7,3.18-2.33,3.58-4.48.41-2.2,1.46-4.66,2.23-6.45.61-1.41.93-2.18.97-2.8.14-.22.41-.59.62-.88.95-1.31,2.26-3.1,2.58-5.01.25-1.51.04-2.86-.15-4.06-.18-1.11-.33-2.07-.11-3,.58-2.46.13-14.69.04-17.11v-.12s-.03-.12-.03-.12c-.38-1.96-.8-3.18-1.19-3.93,1.38-4.75,2.2-9.88,2.9-14.96,1.05-7.67,2.14-15.61,2.58-23.52.24-4.29.28-8.85-1-13.11ZM18.26,154.34c-.01.18-.03.34-.05.47-.27.26-.75.39-1.24.31-.3-.04-1.03-.24-1.33-1.07-.28-.77-.52-1.87-.76-2.94-.58-2.59-1.01-4.51-2.24-5.16-1-1.35-4.04-10.31-3.06-17.62l.04-.3-.07-.29c-1.2-4.69-1.82-9.57-1.56-11.69.42.75.82,1.43,1.19,2.07,1.71,3.44,3.75,6.72,6.22,9.93l.23.3c.03.19.07.38.11.58,1.27,7.14,2.81,21.74,2.54,25.41Zm49.52-46.43c-2.44.89-5.33,1.03-7.54.38-9.93-2.91-20.44-3.87-32.15-2.91-2.34.19-4.63.59-7.05,1.01-.96.17-1.96.34-2.97.5-.02-.46-.03-.99-.04-1.61.95-9.76,2.96-20.63,6.08-33.04.83-3.3,2.46-5.34,4.34-7.71,1.18-1.48,2.4-3.01,3.55-4.99.36-.63.72-1.35,1.1-2.11,1.32-2.68,2.97-6.01,6.03-7.31,4.49-1.89,9.65-2.7,14.51-2.25,3.06.28,10.51,1.56,13.53,7.42.58,1.12.98,2.37,1.41,3.7.76,2.36,1.55,4.79,3.39,6.62,3.16,3.14,7.4,2.83,11.5,2.52,1.57-.12,3.2-.24,4.67-.14,5.6.36,11.23,4.45,14.68,10.67,1.08,1.95,1.93,4.03,2.61,6.15l2.85,17.13c.05.6.1,1.2.14,1.79-.49-.11-.97-.21-1.44-.28-1.03-.17-1.97-.32-2.91-.37-13.54-.71-25.42.86-36.31,4.81Zm33.31,18.55c-1.29,3.73-4.03,5.93-8.63,6.92-1.07.23-2.18.35-2.99.43-.3.03-.56.06-.77.09-5.53.1-9.61-.59-12.82-4.29-2.82-3.25-3.95-7.27-4.75-11.13l-.08-.4c-.07-.33-.14-.66-.2-1-.48-2.68.27-4.4,2.43-5.56,5.81-3.11,12.24-4.69,19.12-4.69.27,0,.55,0,.83,0,1.95.04,3.74.15,5.47.35,2.58.3,4.11,2.03,4.31,4.87.33,4.91-.31,9.75-1.91,14.39Zm-43.79-8.31l-.11.59c-.44,2.46-.89,5.01-1.72,7.34-1.92,5.42-5.56,8.52-10.52,8.97-3.76.34-6.76.32-9.44-.08-4.53-.68-7.5-3.62-8.57-8.52-.76-3.48-1.52-7.22-1.88-11.06-.3-3.21,1.19-5.27,4.2-5.8,1.75-.31,3.55-.52,5-.69.58-.07,1.11-.13,1.57-.19,7.37-.1,13.01.9,18.3,3.22,2.93,1.29,3.76,2.91,3.16,6.21Zm49.65,31.54c-.57,2.71-1.2,5.52-1.91,8.31-4.49,17.82-9.99,28.3-15.47,29.5l-.46.1-.3.39c-.09.12-9.11,11.53-20.4,13.41-12.09,2.02-20.53-1.32-30.1-11.9-7.45-8.24-12.61-16.2-15.35-23.69-.59-1.61-1.33-6.9-2-11.88.07-2.1-.11-6.08-.95-13.78-.29-2.66-.87-7.57-1.56-11.42.09-5.04.15-10.95.05-15.25.04.22.08.45.12.67.07.4.47.89.81.98,1.86.48,2.6,2,3.14,4.14.14.57.29,1.14.43,1.71.66,2.62,1.33,5.32,2.11,7.94.97,3.26,3.05,5.73,6.02,7.12,3.42,1.61,6.85,2.42,10.25,2.42,2.01,0,4.02-.28,6-.85,6.31-1.8,10.41-6.87,12.52-15.49.4-1.64.82-3.33,1.46-4.87.42-1.01,1.46-1.66,2.71-1.71,1.27-.05,2.36.53,2.86,1.51.74,1.46,1.25,3.07,1.71,4.6,2.57,8.49,7.02,13.35,13.62,14.84,4.65,1.05,9.23-.08,12.7-1.17,4.91-1.55,8.01-5.02,9.22-10.31.51-2.24.91-4.56,1.28-6.8.09-.55.18-1.09.28-1.64.33-1.91.82-3.83,2.9-4.51.16-.05.35-.2.5-.37.16,1.47.35,2.94.58,4.4.17,2.37.33,4.71.46,6.68.17,2.55.28,4.45.28,4.92,0,1.38-1.19,10.94-3.51,22.01Zm14.7-18.24c-.2,1.21-1.27,2.68-2.05,3.74-.76,1.04-1.26,1.73-1.21,2.52-.11.34-.44,1.1-.7,1.73-.82,1.92-1.95,4.56-2.42,7.09-.27,1.45-1.14,2.06-1.82,2.31-1.03.38-2.27.21-3.45-.44,2.13-10.57,3.17-19.29,3.17-20.7,0-.51-.11-2.38-.27-4.83.14-1.08.26-2.15.33-3.18,3.77-3.03,6.33-7.09,8.16-11.69,0,0,0,.02,0,.03.21,5.47.4,14.59.03,16.17-.36,1.52-.13,2.94.07,4.19.17,1.06.33,2.05.16,3.06Zm-8.45-15.57c.5-.57,1.24-1.41,2.08-2.37-.64.86-1.32,1.67-2.07,2.42,0-.02,0-.03,0-.05Z"/>
    </g>
  </g>
</svg>';

    $logoSvgEnc = base64_encode($logoSvg);

    $arrowsSvg = '<svg width="400" height="24" xmlns="http://www.w3.org/2000/svg">';
    for($i=0; $i<11; $i++) {
        $arrowsSvg .= '<polygon points="'.($i*32).',4 '.($i*32 + 11).',11 '.($i*32).',18" fill="none" stroke="#5b377a" stroke-width="2"/>';
    }
    $arrowsSvg .= '</svg>';
    $arrowsSvgEnc = base64_encode($arrowsSvg);

    $slashesSvg = '<svg width="150" height="40" xmlns="http://www.w3.org/2000/svg">';
    for($i=0; $i<10; $i++) {
        $slashesSvg .= '<line x1="'.($i*13).'" y1="40" x2="'.($i*13 + 30).'" y2="0" stroke="#9767b8" stroke-width="1.5"/>';
    }
    $slashesSvg .= '</svg>';
    $slashesSvgEnc = base64_encode($slashesSvg);

    $amount = (float) $transaction->amount;
    $currency = strtoupper($transaction->currency ?? 'EGP');
    $formatMoney = function ($amount) use ($currency) {
        $value = number_format(abs((float) $amount), 2, '.', ',');

        return match ($currency) {
            'USD' => '$'.$value,
            'EUR' => 'EUR '.$value,
            'GBP' => 'GBP '.$value,
            default => $value.' '.$currency,
        };
    };
    $signedAmount = ($amount < 0 ? '-' : '').$formatMoney($amount);
    @endphp

    <img src="data:image/svg+xml;base64,{{ $bgSvgEnc }}" style="position: absolute; top:0; left:0; width:794px; height:1123px; z-index: -100;" />

    <div style="position: absolute; top: 15px; left: 45px; width: 55px;">
        <img src="data:image/svg+xml;base64,{{ $logoSvgEnc }}" width="55" alt="Logo">
    </div>
    
    <div style="position: absolute; top: 40px; left: 125px; font-size: 26px; color: #5b377a; letter-spacing: -0.5px; font-weight: 300; line-height: 0.9;">
        NOUR ABO<br>ELSOUD
    </div>

    <!-- Font thickness bumped to 200, pushed vertically up, reduced tracking scale ~7% -->
    <div style="position: absolute; top: 60px; right: 50px; font-size: 52px; color: #5b377a; letter-spacing: 4px; font-weight: 200;">
        TRANSACTION
    </div>

    <!-- Scaled up arrows, more spacing, centered down relative to pill -->
    <div style="position: absolute; top: 182px; left: 70px;">
        <img src="data:image/svg+xml;base64,{{ $arrowsSvgEnc }}" width="400" />
    </div>

    <!-- Narrowed width container to 40% (320px) -->
    <div style="position: absolute; top: 177px; right: 0; width: 320px; background-color: #9767b8; border-top-left-radius: 20px; border-bottom-left-radius: 20px; padding: 7px 20px; color: #ffffff; font-size: 13px;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td width="50%" align="center" style="font-weight: 600; color: #ffffff;">ID: #{{ $transaction->id }}</td>
                <td width="50%" align="center" style="font-weight: 600; color: #ffffff;">Date: {{ $transaction->occurred_date?->format('d/m/Y') ?? 'N/A' }}</td>
            </tr>
        </table>
    </div>

    <div style="position: absolute; top: 250px; left: 70px;">
        <div style="font-size: 13px; color: #333; font-weight: bold;">Project:</div>
        <div style="font-size: 14px; color: #1e1e1e; margin-top: 8px; margin-left: 15px; font-weight: bold;">
            {{ $transaction->project->name ?? '—' }}
        </div>
    </div>

    <div style="position: absolute; top: 285px; right: 70px;">
        <img src="data:image/svg+xml;base64,{{ $slashesSvgEnc }}" width="150" />
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
                <td width="30%" align="left" style="padding-top: 30px;">{{ $signedAmount }}</td>
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
                    <div style="font-size:11px; color:#444; margin-bottom:4px; font-weight: bold;">Total</div>
                    <div style="white-space: nowrap; margin-bottom: 0;">
                        <span style="font-size:17px; font-weight: bold; color:#5b377a;">{{ $signedAmount }}</span>
                    </div>
                </td>
            </tr>
        </table>
        
        <div style="margin-top: 70px; width: 0;"></div>
    </div>
    
    <div style="position: absolute; bottom: 80px; left: 60px;">
        <div style="border-bottom: 1px solid #1e1e1e; width: 220px;"></div>
        <div style="margin-top: 15px; font-weight: 600; font-size: 15px; color:#5b377a;">Nour Abo Elsoud</div>
    </div>

    <!-- Absolute Footer Info -->
    <div style="position: absolute; bottom: 50px; right: 60px; text-align: right; color: #fff; font-size: 11px; line-height: 1.8;">
        01127860029<br>
        https://nouraboelsoud.com
    </div>

</body>
</html>
