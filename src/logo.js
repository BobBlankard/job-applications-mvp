const LOGO_VIEWBOX = '0 0 32 32';

const LOGO_INNER = `
  <rect width="32" height="32" rx="7" fill="#000"/>
  <g transform="translate(8 21) rotate(-38)">
    <rect x="0" y="0" width="5" height="16" rx="0.5" fill="#fff"/>
    <path d="M0 16 L2.5 20 L5 16" fill="#fff"/>
    <rect x="0" y="-4" width="5" height="4" rx="1" fill="#fff" opacity="0.55"/>
  </g>
`;

export function renderAppLogo({ className = 'app-logo', size = 32, title = 'Resume Builder' } = {}) {
  return `
    <svg
      class="${className}"
      width="${size}"
      height="${size}"
      viewBox="${LOGO_VIEWBOX}"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="${title}"
    >${LOGO_INNER}</svg>
  `.trim();
}

export const APP_LOGO_SVG = `<svg viewBox="${LOGO_VIEWBOX}" fill="none" xmlns="http://www.w3.org/2000/svg">${LOGO_INNER}</svg>`;
