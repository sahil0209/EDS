// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

// Fixed background colors
const bgColors = [
  { label: 'Primary Blue', cssVar: '--primary' },
  { label: 'Navy Blue', cssVar: '--navy' },
  { label: 'Light Gray', cssVar: '--light-gray' },
  { label: 'Black', cssVar: '--black' },
];

// Fixed text colors
const textColors = [
  { label: 'White', cssVar: '--white' },
  { label: 'Primary Blue', cssVar: '--primary' },
  { label: 'Navy Blue', cssVar: '--navy' },
  { label: 'Black', cssVar: '--black' },
];

(async function init() {
  const { actions } = await DA_SDK;

  function renderColors(containerId, colors, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    colors.forEach((color) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = `var(${color.cssVar})`;
      swatch.title = color.label;

      swatch.addEventListener('click', () => {
        actions.sendHTML(`${type} color = "${color.label}"`);
        actions.closeLibrary();
      });

      container.appendChild(swatch);
    });
  }

  renderColors('bg-colors', bgColors, 'Background');
  renderColors('text-colors', textColors, 'Font');
}());
