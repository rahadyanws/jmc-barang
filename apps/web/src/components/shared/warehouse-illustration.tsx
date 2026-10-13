export function WarehouseIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 480"
      role="img"
      aria-label="Ilustrasi gudang penyimpanan barang"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="640" height="480" rx="12" fill="#1B2638" />
      <rect x="48" y="300" width="544" height="140" rx="6" fill="#24344D" />
      <rect x="48" y="300" width="544" height="10" rx="4" fill="#337DA0" />

      <g stroke="#3D506B" strokeWidth="8" strokeLinecap="round">
        <path d="M96 300V140" />
        <path d="M280 300V140" />
        <path d="M464 300V140" />
        <path d="M72 140H560" />
        <path d="M72 220H560" />
      </g>

      <g>
        <rect x="112" y="160" width="64" height="52" rx="4" fill="#337DA0" />
        <rect x="188" y="172" width="72" height="40" rx="4" fill="#5B9BB8" />
        <rect x="112" y="240" width="88" height="52" rx="4" fill="#8FB9CE" />
        <rect x="212" y="252" width="48" height="40" rx="4" fill="#337DA0" />

        <rect x="296" y="156" width="72" height="56" rx="4" fill="#5B9BB8" />
        <rect x="380" y="168" width="60" height="44" rx="4" fill="#337DA0" />
        <rect x="296" y="236" width="52" height="56" rx="4" fill="#337DA0" />
        <rect x="360" y="248" width="88" height="44" rx="4" fill="#8FB9CE" />

        <rect x="480" y="164" width="56" height="48" rx="4" fill="#8FB9CE" />
        <rect x="480" y="240" width="72" height="52" rx="4" fill="#5B9BB8" />
      </g>

      <g stroke="#2A3B55" strokeWidth="3">
        <path d="M112 186H176" />
        <path d="M112 266H200" />
        <path d="M296 184H368" />
        <path d="M360 270H448" />
        <path d="M480 188H536" />
        <path d="M480 266H552" />
      </g>

      <circle cx="560" cy="88" r="34" fill="#24344D" />
      <path
        d="M548 88l8 8 16-18"
        stroke="#22A06B"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
