const fs = require('fs');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#0a0d14"/>
  <circle cx="256" cy="256" r="180" fill="#1e2638" stroke="#3b82f6" stroke-width="16"/>
  <circle cx="256" cy="256" r="120" fill="#111827" stroke="#10b981" stroke-width="8" stroke-dasharray="12, 12"/>
  <circle cx="256" cy="256" r="40" fill="#3b82f6"/>
  <circle cx="256" cy="256" r="16" fill="#ffffff"/>
  <path d="M256 100 L256 160" stroke="#3b82f6" stroke-width="12" stroke-linecap="round"/>
  <path d="M256 352 L256 412" stroke="#3b82f6" stroke-width="12" stroke-linecap="round"/>
  <path d="M100 256 L160 256" stroke="#3b82f6" stroke-width="12" stroke-linecap="round"/>
  <path d="M352 256 L412 256" stroke="#3b82f6" stroke-width="12" stroke-linecap="round"/>
</svg>`;

fs.writeFileSync('public/icons/icon.svg', svgIcon);

const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync('public/icons/icon-192x192.png', minimalPng);
fs.writeFileSync('public/icons/icon-512x512.png', minimalPng);
console.log('Icons generated successfully');
