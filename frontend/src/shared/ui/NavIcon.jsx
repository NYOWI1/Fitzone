const iconPaths = {
  calendar: (
    <>
      <path d='M4 6.5h16M7 3v4M17 3v4M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z' />
      <path d='M8 11h3v3H8zM14 11h3v3h-3zM8 16h3v2H8zM14 16h3v2h-3z' />
    </>
  ),
  card: (
    <>
      <rect height='15' rx='2' width='20' x='2' y='4.5' />
      <path d='M2 9h20M6 15h4' />
    </>
  ),
  chart: (
    <>
      <path d='M4 20V10M10 20V4M16 20v-7M22 20H2' />
    </>
  ),
  dashboard: (
    <>
      <rect height='7' rx='1.5' width='7' x='3' y='3' />
      <rect height='7' rx='1.5' width='7' x='14' y='3' />
      <rect height='7' rx='1.5' width='7' x='3' y='14' />
      <rect height='7' rx='1.5' width='7' x='14' y='14' />
    </>
  ),
  document: (
    <>
      <path d='M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6' />
    </>
  ),
  eye: (
    <>
      <path d='M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z' />
      <circle cx='12' cy='12' r='2.5' />
    </>
  ),
  settings: (
    <>
      <circle cx='12' cy='12' r='3' />
      <path d='M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7-.7-2h-3l-.7 2-1.7.7-1.9-.9L2.1 6.2 3 8.1l-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7Z' />
    </>
  ),
  trainer: (
    <>
      <path d='M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12' />
    </>
  ),
  users: (
    <>
      <circle cx='9' cy='8' r='3' />
      <path d='M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M16 5.5a3 3 0 0 1 0 5.5M17 14a5 5 0 0 1 4 4.9V20' />
    </>
  )
};

function getIconKey(name = '') {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes('class')) return 'calendar';
  if (normalizedName.includes('trainer') || normalizedName.includes('pt'))
    return 'trainer';
  if (normalizedName.includes('member')) return 'users';
  if (normalizedName.includes('payment')) return 'card';
  if (normalizedName.includes('report') || normalizedName.includes('progress'))
    return 'chart';
  if (normalizedName.includes('setting')) return 'settings';
  if (normalizedName.includes('crowd')) return 'eye';
  if (normalizedName.includes('plan')) return 'document';
  return 'dashboard';
}

export default function NavIcon({ name }) {
  return (
    <svg
      aria-hidden='true'
      className='fitzone-nav-icon'
      fill='none'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      {iconPaths[getIconKey(name)]}
    </svg>
  );
}
