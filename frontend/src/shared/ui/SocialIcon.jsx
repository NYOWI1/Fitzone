const socialPlatforms = {
  FB: {
    label: 'Facebook',
    url: 'https://www.facebook.com/'
  },
  IG: {
    label: 'Instagram',
    url: 'https://www.instagram.com/'
  },
  TT: {
    label: 'TikTok',
    url: 'https://www.tiktok.com/'
  },
  YT: {
    label: 'YouTube',
    url: 'https://www.youtube.com/'
  }
};

const socialAliases = {
  FACEBOOK: 'FB',
  INSTAGRAM: 'IG',
  TIKTOK: 'TT',
  YOUTUBE: 'YT'
};

export function getSocialPlatform(name = '') {
  const normalizedName = String(name).trim().toUpperCase();
  const platformKey = socialAliases[normalizedName] || normalizedName;

  return socialPlatforms[platformKey] || null;
}

export default function SocialIcon({ name }) {
  const platform = getSocialPlatform(name);

  if (!platform) return null;

  const iconName = platform.label.toLowerCase();

  return (
    <svg
      aria-hidden='true'
      className='h-4 w-4'
      fill='currentColor'
      focusable='false'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
    >
      {iconName === 'facebook' && (
        <path d='M13.6 22v-9h3l.5-3h-3.5V8.1c0-.9.3-1.6 1.8-1.6H17V3.8c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5V10H7v3h3v9h3.6Z' />
      )}
      {iconName === 'instagram' && (
        <>
          <path d='M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2.2A2.8 2.8 0 0 0 4.2 7v10A2.8 2.8 0 0 0 7 19.8h10a2.8 2.8 0 0 0 2.8-2.8V7A2.8 2.8 0 0 0 17 4.2H7Z' />
          <path d='M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6ZM18.3 6.7a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z' />
        </>
      )}
      {iconName === 'tiktok' && (
        <path d='M14.2 2h3.2c.2 1.8 1.2 3.2 2.6 4.1.8.5 1.5.7 2 .7V10a8.7 8.7 0 0 1-4.6-1.4v7.1a6.3 6.3 0 1 1-5.5-6.3v3.3a3.1 3.1 0 1 0 2.3 3V2Z' />
      )}
      {iconName === 'youtube' && (
        <>
          <path d='M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8Z' />
          <path d='m9.6 15.6 6.2-3.6-6.2-3.6v7.2Z' fill='#0f0f0f' />
        </>
      )}
    </svg>
  );
}
