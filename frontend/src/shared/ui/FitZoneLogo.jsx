export default function FitZoneLogo({ className = '' }) {
  return (
    <svg
      aria-hidden='true'
      className={`block flex-none ${className}`}
      focusable='false'
      viewBox='0 0 48 48'
      xmlns='http://www.w3.org/2000/svg'
    >
      <rect fill='#e6002e' height='46' rx='12' width='46' x='1' y='1' />
      <rect
        fill='none'
        height='42'
        opacity='0.55'
        rx='10'
        stroke='#ff6b88'
        strokeWidth='1.5'
        width='42'
        x='3'
        y='3'
      />
      <path d='M10 9h22l-4 6H18v5h10l-4 6h-6v13h-8V9Z' fill='white' />
      <path d='M32 8h8l-7 13h7L24 40l5-14h-7L32 8Z' fill='#171717' />
    </svg>
  );
}
