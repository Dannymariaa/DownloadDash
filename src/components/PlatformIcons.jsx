import React from 'react';

export const TikTokIcon = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="32" height="32" rx="7" fill="#010101"/>
    <path d="M20.8 9.2a4.3 4.3 0 01-2.6-2.2H15.6v11c0 1.2-.9 2.1-2.1 2.1s-2.1-.9-2.1-2.1.9-2.1 2.1-2.1c.2 0 .4 0 .6.1v-2.9c-.2 0-.4-.1-.6-.1A5 5 0 008.5 18a5 5 0 005 5 5 5 0 005-5V12c.9.6 2 .9 3.1.9v-2.8c-.3 0-.6-.5-.8-.9z" fill="#EE1D52"/>
    <path d="M20.8 9.2a4.3 4.3 0 01-2.6-2.2H15.6v11c0 1.2-.9 2.1-2.1 2.1s-2.1-.9-2.1-2.1.9-2.1 2.1-2.1c.2 0 .4 0 .6.1v-2.9c-.2 0-.4-.1-.6-.1A5 5 0 008.5 18a5 5 0 005 5 5 5 0 005-5V12c.9.6 2 .9 3.1.9v-2.8c-.3 0-.6-.5-.8-.9z" fill="white" opacity="0.25" transform="translate(-0.5 0)"/>
    <path d="M21.5 8.5c-.5-1-1.4-1.8-2.3-2.5h-3v11c0 1.2-.9 2.1-2.1 2.1s-2.1-.9-2.1-2.1.9-2.1 2.1-2.1v-3a5 5 0 00-5 5 5 5 0 005 5 5 5 0 005-5v-5.5c.9.5 1.9.8 3 .8V9.3c-.6-.1-.9-.6-1-.8z" fill="white"/>
  </svg>
);

export const InstagramIcon = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="ig-bg" x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEDA77"/>
        <stop offset="25%" stopColor="#F58529"/>
        <stop offset="50%" stopColor="#DD2A7B"/>
        <stop offset="75%" stopColor="#8134AF"/>
        <stop offset="100%" stopColor="#515BD4"/>
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="7" fill="url(#ig-bg)"/>
    <rect x="7.5" y="7.5" width="17" height="17" rx="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
    <circle cx="16" cy="16" r="4.2" stroke="white" strokeWidth="1.8" fill="none"/>
    <circle cx="21.5" cy="10.5" r="1.3" fill="white"/>
  </svg>
);

export const FacebookIcon = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="32" height="32" rx="7" fill="#1877F2"/>
    <path d="M21.5 16h-3.7v10.5h-4V16H11v-4h2.8v-2.3c0-2.8 1.7-4.3 4.1-4.3.8 0 1.7.1 2.5.2v3.1h-1.4c-1 0-1.3.5-1.3 1.4V12h3l-.2 4z" fill="white"/>
  </svg>
);

export const TwitterXIcon = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="32" height="32" rx="7" fill="#000000"/>
    <path d="M8.5 8h5.2l4.1 5.8L22.5 8H25l-6.3 7.2 7.3 8.8h-5.2l-4.5-6.3-5 6.3H9l6.7-8.2L8.5 8z" fill="white"/>
  </svg>
);

export const WhatsAppIcon = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="32" height="32" rx="7" fill="#25D366"/>
    <path d="M16 7C11 7 7 11 7 16c0 1.8.5 3.5 1.4 5L7 25l4.2-1.3A9 9 0 0016 25c5 0 9-4 9-9s-4-9-9-9z" fill="white"/>
    <path d="M20.8 18.8c-.3.7-1.5 1.4-2.1 1.4-.5.1-1.3.1-2-.2-.5-.2-1-.4-1.7-.7-2.7-1.3-4.4-4-4.5-4.2-.1-.1-.9-1.3-.9-2.4 0-1.1.6-1.7.8-1.9.2-.3.5-.3.7-.3h.4c.2 0 .4.1.6.5l.7 1.7c.1.2.1.4 0 .6l-.4.5c-.2.2-.3.3-.2.5.4.8 1 1.4 1.6 1.9.7.5 1.4.9 2.2 1.1.2.1.4 0 .6-.2l.5-.7c.2-.2.4-.3.7-.2l1.8.9c.2.1.4.3.4.5v.6c0 .1 0 .3-.2.5z" fill="#25D366"/>
  </svg>
);

export const YouTubeIcon = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="32" height="32" rx="7" fill="#FF0000"/>
    <path d="M26.5 11.3a2.8 2.8 0 00-2-2C23 9 16 9 16 9s-7 0-8.5.3a2.8 2.8 0 00-2 2C5.2 12.8 5.2 16 5.2 16s0 3.2.3 4.7a2.8 2.8 0 002 2C9 23 16 23 16 23s7 0 8.5-.3a2.8 2.8 0 002-2c.3-1.5.3-4.7.3-4.7s0-3.2-.3-4.7z" fill="white" opacity="0"/>
    <path d="M13.5 19.5v-7l7 3.5z" fill="white"/>
  </svg>
);

export const TelegramIcon = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="32" height="32" rx="7" fill="#0088CC"/>
    <path d="M25.5 8L5 15.5l7 2.2 2.5 7.8 3.5-3.5 5 3.5 3-17.5z" fill="white" opacity="0.2"/>
    <path d="M5 15.5l20.5-7.5-3 17.5-5-3.5-3.5 3.5-2.5-7.8 10.5-6.2-8.5 5.8-8.5-1.8z" fill="white"/>
    <path d="M12 17.7l1.5 4.8.5-3.3 7.5-7-9.5 5.5z" fill="#C8DAEA"/>
  </svg>
);

export const SnapchatIcon = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="32" height="32" rx="7" fill="#FFFC00"/>
    <path d="M16 5.5c-3.3 0-5.8 2.7-5.8 6 0 .4 0 .9-.5 1-.5.2-.9.2-.9.9 0 .5.5.7.9.8h.2c-.5.7-1.4 1.2-2.2 1.3.1.7.6 1 1.4 1.2 0 .3.4.7.5.9-.1.3-.4.5-.9.5-1 0-1 .5-1 .8 0 .6.8 1.1 1.9 1.4.5 1.1 1.5 1.7 2.3 1.7.8 0 1.9-.7 2.6-1.7 1-.3 1.8-.8 1.8-1.4 0-.3 0-.8-1-.8-.5 0-.8-.2-.9-.5.1-.2.5-.6.5-.9.7-.2 1.3-.5 1.4-1.2-.8-.1-1.7-.6-2.2-1.3h.2c.4-.1.9-.3.9-.8 0-.7-.4-.7-.9-.9-.5-.1-.5-.6-.5-1 0-3.3-2.5-6-5.8-6z" fill="#1a1a1a"/>
    <path d="M16 5.5c3.3 0 5.8 2.7 5.8 6 0 .4 0 .9.5 1 .5.2.9.2.9.9 0 .5-.5.7-.9.8h-.2c.5.7 1.4 1.2 2.2 1.3-.1.7-.6 1-1.4 1.2 0 .3-.4.7-.5.9.1.3.4.5.9.5 1 0 1 .5 1 .8 0 .6-.8 1.1-1.9 1.4-.5 1.1-1.5 1.7-2.3 1.7-.8 0-1.9-.7-2.6-1.7" stroke="#1a1a1a" strokeWidth="0.5" fill="none"/>
  </svg>
);

export const PinterestIcon = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="32" height="32" rx="7" fill="#E60023"/>
    <path d="M16 5c-6.1 0-11 4.9-11 11 0 4.5 2.7 8.3 6.6 9.9-.1-.8-.2-2.1 0-3 .2-.8 1.3-5.5 1.3-5.5s-.3-.7-.3-1.7c0-1.6 1-2.8 2.3-2.8 1.1 0 1.6.8 1.6 1.8 0 1.1-.7 2.7-1.1 4.2-.3 1.3.6 2.3 1.8 2.3 2.2 0 3.8-2.3 3.8-5.6 0-2.9-2.1-4.9-5.1-4.9-3.5 0-5.5 2.6-5.5 5.3 0 1 .4 2.2 1 2.8.1.1.1.2.1.3l-.4 1.5c0 .1-.2.1-.2 0-1.4-.6-2.2-2.7-2.2-4.3 0-3.5 2.5-6.7 7.3-6.7 3.8 0 6.8 2.7 6.8 6.4 0 3.8-2.4 6.9-5.8 6.9-1.1 0-2.2-.6-2.6-1.3l-.7 2.7c-.3.9-1 2-1.5 2.7 1.1.3 2.3.5 3.5.5 6.1 0 11-4.9 11-11S22.1 5 16 5z" fill="white"/>
  </svg>
);

export const RedditIcon = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="32" height="32" rx="7" fill="#FF4500"/>
    <circle cx="16" cy="18" r="6.5" fill="white"/>
    <circle cx="13" cy="17" r="1.2" fill="#FF4500"/>
    <circle cx="19" cy="17" r="1.2" fill="#FF4500"/>
    <path d="M13.5 21c.6.7 1.5 1.1 2.5 1.1s1.9-.4 2.5-1.1" stroke="#FF4500" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    <circle cx="22.5" cy="9.5" r="2.8" fill="white"/>
    <circle cx="9.5" cy="9.5" r="2.8" fill="white"/>
    <circle cx="16" cy="8" r="2.2" fill="white"/>
    <path d="M16 10.2V14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M13 10c.5-1.3 1.7-2.2 3-2.2s2.5.9 3 2.2" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
  </svg>
);

const icons = {
  tiktok: TikTokIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  twitter: TwitterXIcon,
  whatsapp: WhatsAppIcon,
  youtube: YouTubeIcon,
  telegram: TelegramIcon,
  snapchat: SnapchatIcon,
  pinterest: PinterestIcon,
  reddit: RedditIcon,
};

export const getPlatformIcon = (platform, size = 32, className = "") => {
  const Icon = icons[platform];
  return Icon ? <Icon size={size} className={className} /> : null;
};

export default icons;