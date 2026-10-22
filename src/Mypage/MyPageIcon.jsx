import React from "react";

// Decorative icons; the adjacent Korean text provides the menu's accessible name.
const shapes = {
  luggage: <>
    <rect x="4" y="7" width="16" height="14" rx="2" />
    <path d="M9 7V5a3 3 0 0 1 6 0v2M4 13h16M12 13v3" />
  </>,
  bookmark: <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />,
  folder: <path d="M3 6.5a2 2 0 0 1 2-2h5l2.2 2.5H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11Z" />,
  history: <>
    <path d="M3 10a9 9 0 1 1 1.4 6" />
    <path d="M3 4v6h6M12 7v5l3.5 2" />
  </>,
  review: <>
    <path d="M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" />
    <path d="M8 9h6M8 13h4" />
    <path d="m13 17 5.8-5.8 2 2L15 19l-3 1 1-3Z" />
  </>,
  message: <>
    <path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.6-.8L3 21l1.7-4.9A8.5 8.5 0 1 1 20 11.5Z" />
    <path d="M8 11.5h8M8 14.5h5" />
  </>,
  "user-edit": <>
    <circle cx="9.5" cy="8" r="3.5" />
    <path d="M3.5 20v-1a6 6 0 0 1 9.5-4.9" />
    <path d="m15 18 4-4 2 2-4 4-3 1 1-3Z" />
  </>,
  lock: <>
    <rect x="5" y="10" width="14" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
  </>,
  logout: <>
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <path d="M13 8l4 4-4 4M8 12h9" />
  </>,
  settings: <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v2M12 19.5v2M4.5 4.5l1.4 1.4M18.1 18.1l1.4 1.4M2.5 12h2M19.5 12h2M4.5 19.5l1.4-1.4M18.1 5.9l1.4-1.4" />
  </>,
  avatar: <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </>,
  chevron: <path d="m9 5 7 7-7 7" />,
};

export default function MyPageIcon({ name }) {
  const shape = shapes[name];
  if (!shape) return null;
  return (
    <svg
      data-mypage-icon={name}
      viewBox="0 0 24 24"
      width="24" height="24"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      {shape}
    </svg>
  );
}
