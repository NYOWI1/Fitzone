export default function DefaultProfileAvatar({
  className = '',
  imageUrl = '',
  name = 'User'
}) {
  if (imageUrl) {
    return (
      <img
        alt={`${name} profile`}
        className={`block flex-none rounded-full border border-[#414141] bg-[#2b2b2b] object-cover ${className}`}
        src={imageUrl}
      />
    );
  }

  return (
    <span
      aria-label={`${name} profile`}
      className={`grid flex-none place-items-center rounded-full border border-[#414141] bg-[#2b2b2b] text-[#b8b8b8] ${className}`}
      role='img'
    >
      <svg
        aria-hidden='true'
        className='h-[58%] w-[58%]'
        fill='none'
        viewBox='0 0 24 24'
        xmlns='http://www.w3.org/2000/svg'
      >
        <circle cx='12' cy='8' fill='currentColor' r='4' />
        <path d='M4.5 21a7.5 7.5 0 0 1 15 0H4.5Z' fill='currentColor' />
      </svg>
    </span>
  );
}
