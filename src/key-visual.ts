/**
 * Builds a "lit" key image as an SVG data URI, tinted with the chosen accent.
 * Used to flash a key on press (momentary) or hold it lit while latched (toggle),
 * so the deck gives visual feedback that a message went out.
 */
const KEY_SIZE = 144;

export function buildLitKeyImage(colorHex: string): string {
  const color = /^#?[0-9a-fA-F]{6}$/.test(colorHex) ? colorHex.replace(/^#?/, "#") : "#7c3aed";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${KEY_SIZE}" height="${KEY_SIZE}" viewBox="0 0 ${KEY_SIZE} ${KEY_SIZE}">
  <defs>
    <radialGradient id="g" cx="50%" cy="46%" r="60%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.9"/>
      <stop offset="55%" stop-color="${color}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.08"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${KEY_SIZE}" height="${KEY_SIZE}" rx="26" fill="#0a0a0f"/>
  <rect x="0" y="0" width="${KEY_SIZE}" height="${KEY_SIZE}" rx="26" fill="url(#g)"/>
  <rect x="6" y="6" width="${KEY_SIZE - 12}" height="${KEY_SIZE - 12}" rx="22" fill="none" stroke="${color}" stroke-width="4" opacity="0.9"/>
</svg>`;
  return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}
