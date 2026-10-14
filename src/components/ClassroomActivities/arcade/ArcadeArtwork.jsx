export function GiftArtwork({ color = '#ed6c8d', opened = false, missed = false }) {
  return <svg viewBox="0 0 180 160" className={`arcade-gift-art${opened ? ' is-open' : ''}`} aria-hidden="true">
    <ellipse cx="90" cy="147" rx="61" ry="9" fill="#20394d" opacity=".12" />
    {opened && !missed && <g className="arcade-gift-spark"><path d="m90 29 7 14 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2Z" fill="#ffcf56" stroke="#fff5ce" strokeWidth="3" /><path d="m48 36 3 7 7 3-7 3-3 7-3-7-7-3 7-3Zm81 13 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#ffcf56" /></g>}
    <rect x="34" y="78" width="112" height="62" rx="9" fill={color} />
    <path d="M129 78h17v53a9 9 0 0 1-9 9h-8Z" fill="#20394d" opacity=".15" />
    <rect x="79" y="80" width="22" height="60" fill="#fff3d4" /><path d="M40 131h34" stroke="#fff" strokeWidth="4" opacity=".3" strokeLinecap="round" />
    <g className="arcade-gift-lid"><rect x="27" y="62" width="126" height="28" rx="8" fill={color} stroke="#fff" strokeWidth="3" />
      <rect x="79" y="62" width="22" height="28" fill="#fff3d4" />
      <path d="M87 62C50 65 47 39 58 35c12-5 25 14 29 27Zm6 0c37 3 40-23 29-27-12-5-25 14-29 27Z" fill="none" stroke="#fff3d4" strokeWidth="9" strokeLinejoin="round" />
      <circle cx="90" cy="59" r="9" fill="#fff3d4" />
    </g>
    {missed && <path d="m76 108 28 20m0-20-28 20" stroke="#fff" strokeWidth="6" strokeLinecap="round" />}
  </svg>;
}

export function RobotAvatar({ color = '#1576cf', happy = false, ...props }) {
  return <svg viewBox="0 0 120 150" aria-hidden="true" {...props}>
    <ellipse cx="61" cy="141" rx="39" ry="7" fill="#153a50" opacity=".14" />
    <path d="M41 117v17m37-17v17" stroke="#273e59" strokeWidth="11" strokeLinecap="round" />
    <path d="M31 137h20m17 0h20" stroke={color} strokeWidth="13" strokeLinecap="round" />
    <rect x="30" y="76" width="61" height="49" rx="18" fill={color} />
    <path d="M33 88 18 102m70-13 18 11" stroke={color} strokeWidth="13" strokeLinecap="round" />
    <circle cx="17" cy="103" r="8" fill="#ffdcaf" /><circle cx="107" cy="101" r="8" fill="#ffdcaf" />
    <rect x="40" y="86" width="42" height="24" rx="9" fill="#ffffff" opacity=".9" />
    <path d="m54 97 5 5 10-11" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
    <path d="M60 15v15" stroke="#273e59" strokeWidth="5" /><circle cx="60" cy="13" r="7" fill="#ffca55" />
    <rect x="18" y="35" width="86" height="49" rx="19" fill={color} />
    <rect x="25" y="40" width="71" height="35" rx="13" fill="#f1fbff" />
    {happy ? <path d="m39 55 5-4 5 4m22 0 5-4 5 4" fill="none" stroke="#273e59" strokeWidth="4" strokeLinecap="round" /> : <><ellipse cx="44" cy="55" rx="5" ry="7" fill="#273e59" /><ellipse cx="76" cy="55" rx="5" ry="7" fill="#273e59" /></>}
    <path d="M53 66q7 6 14 0" fill="none" stroke="#273e59" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}

export function TugScene({ position, moving }) {
  const shift = -position * 32;
  return <svg viewBox="0 0 1000 290" className={`arcade-tug-scene${moving ? ' is-pulling' : ''}`} role="img" aria-label={`Dây kéo ${Math.abs(position)} bước về ${position > 0 ? 'tổ xanh' : position < 0 ? 'tổ đỏ' : 'vạch giữa'}`}>
    <rect width="1000" height="290" rx="20" fill="#e9f7ff" />
    <circle cx="865" cy="51" r="26" fill="#ffdc75" />
    {[80, 390, 680].map((x, i) => <g key={x} fill="#fff" opacity=".9" transform={`translate(${x} ${30 + i * 9})`}><ellipse cx="38" cy="19" rx="50" ry="17" /><circle cx="20" cy="9" r="19" /><circle cx="51" cy="5" r="23" /></g>)}
    <path d="M0 175Q175 121 340 177t330-2q180-71 330 0v115H0Z" fill="#c7e9d4" />
    <path d="M0 218q160-48 320 0t340 0q180-41 340-2v74H0Z" fill="#96d3b1" />
    <rect x="76" y="221" width="848" height="52" rx="26" fill="#f6e1bb" />
    <path d="M366 220v51m134-51v51m134-51v51" stroke="#c39c69" strokeWidth="3" strokeDasharray="5 5" />
    <text x="500" y="260" fill="#886541" fontSize="14" textAnchor="middle" fontWeight="700">VẠCH GIỮA</text>
    <g className="arcade-rope-group" style={{ transform: `translateX(${shift}px)` }}>
      {[145, 235, 325].map((x, i) => <RobotAvatar key={x} x={x - 40} y={87 + i * 4} width="106" height="145" color="#1576cf" />)}
      {[605, 695, 785].map((x, i) => <RobotAvatar key={x} x={x - 10} y={95 - i * 4} width="106" height="145" color="#e45b62" />)}
      <path d="M150 184q350-7 700 0" fill="none" stroke="#99632d" strokeWidth="10" strokeLinecap="round" /><path d="M150 182q350-7 700 0" fill="none" stroke="#f4d38b" strokeWidth="5" strokeDasharray="5 8" />
      <path d="M500 147v41" stroke="#5b4b52" strokeWidth="4" /><path d="m501 147 39 7-39 13Z" fill="#ffb831" stroke="#fff4d3" strokeWidth="2" /><circle cx="500" cy="183" r="8" fill="#ffe3a7" stroke="#99632d" strokeWidth="3" />
    </g>
  </svg>;
}

export function SecretPicture({ kind, src }) {
  if (kind === 'custom') return <img src={src} alt="Ảnh bí mật để cả lớp đoán" className="arcade-secret-image" draggable={false} />;
  return <svg viewBox="0 0 720 420" className="arcade-secret-image" role="img" aria-label="Tranh thiết bị tin học cần đoán">
    <rect width="720" height="420" fill="#dff3fa" /><circle cx="600" cy="85" r="62" fill="#fff1b7" /><path d="M0 340q190-75 370 0t350-12v92H0Z" fill="#acd9cd" />
    {kind === 'computer' && <><rect x="160" y="57" width="395" height="245" rx="22" fill="#294961" /><rect x="175" y="72" width="365" height="207" rx="10" fill="#91d7ed" /><circle cx="449" cy="126" r="32" fill="#fff0b0" /><path d="m175 229 101-98 108 112 70-67 86 83v20H175Z" fill="#64ad9b" /><path d="M321 303v29h-52v17h180v-17h-52v-29" fill="#45677d" /><rect x="223" y="358" width="280" height="25" rx="8" fill="#fffaf0" /><path d="M246 371h233" stroke="#9bbac5" strokeWidth="5" strokeDasharray="12 5" /><ellipse cx="552" cy="370" rx="21" ry="28" fill="#f4a46b" /><path d="M552 346v20" stroke="#fff" strokeWidth="4" /></>}
    {kind === 'keyboard' && <g transform="rotate(-5 360 210)"><rect x="77" y="107" width="566" height="221" rx="25" fill="#37586a" /><rect x="90" y="119" width="540" height="192" rx="16" fill="#f0f8f7" />{Array.from({ length: 44 }, (_, i) => <rect key={i} x={107 + (i % 11) * 46} y={136 + Math.floor(i / 11) * 39} width="36" height="29" rx="5" fill={i % 7 === 0 ? '#f5c15e' : i % 5 === 0 ? '#82c9d7' : '#c2d8dd'} stroke="#fff" strokeWidth="2" />)}<rect x="252" y="270" width="219" height="25" rx="6" fill="#82c9d7" /></g>}
    {kind === 'mouse' && <><path d="M362 82C225-23 209 63 310 86s-13 53 47 76" fill="none" stroke="#45677d" strokeWidth="9" strokeLinecap="round" /><rect x="254" y="122" width="215" height="250" rx="100" fill="#467c9d" /><path d="M361 128v103m-100 0h201" stroke="#d6eff7" strokeWidth="5" /><rect x="348" y="158" width="26" height="48" rx="12" fill="#f5c15e" /><path d="M289 278q7 51 53 62" fill="none" stroke="#80b1c5" strokeWidth="12" strokeLinecap="round" /></>}
  </svg>;
}
