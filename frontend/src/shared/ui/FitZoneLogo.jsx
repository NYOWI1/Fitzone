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
      <path d='M13 10h24l-4.5 6H21v5.5h11l-4.5 6H21V38h-8V10Z' fill='white' />
    </svg>
  );
}
