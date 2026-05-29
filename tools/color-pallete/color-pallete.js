/* eslint-disable import/no-unresolved */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

/* ===============================
   BACKGROUND COLORS
   =============================== */
const bgColors = [
  { label: 'Primary', token: 'bgcolor-primary', cssVar: '--bgcolor-primary' },
  { label: 'Navy', token: 'bgcolor-navy', cssVar: '--bgcolor-navy' },
  { label: 'Sky Blue', token: 'bgcolor-sky-blue', cssVar: '--bgcolor-sky-blue' },
  { label: 'Light Blue', token: 'bgcolor-light-blue', cssVar: '--bgcolor-light-blue' },

  { label: 'Dark Blue', token: 'bgcolor-dark-blue', cssVar: '--bgcolor-dark-blue' },
  { label: 'Sky Blue Accent', token: 'bgcolor-sky-blue-accent', cssVar: '--bgcolor-sky-blue-accent' },
  { label: 'Turquoise', token: 'bgcolor-turquoise', cssVar: '--bgcolor-turquoise' },
  { label: 'Brand Yellow', token: 'bgcolor-brand-yellow', cssVar: '--bgcolor-brand-yellow' },

  { label: 'Success', token: 'bgcolor-success', cssVar: '--bgcolor-success' },
  { label: 'Danger', token: 'bgcolor-danger', cssVar: '--bgcolor-danger' },

  { label: 'Twitter', token: 'bgcolor-twitter', cssVar: '--bgcolor-twitter' },
  { label: 'Facebook', token: 'bgcolor-facebook', cssVar: '--bgcolor-facebook' },
  { label: 'LinkedIn', token: 'bgcolor-linkedin', cssVar: '--bgcolor-linkedin' },
  { label: 'Pinterest', token: 'bgcolor-pinterest', cssVar: '--bgcolor-pinterest' },

  { label: 'Light Sky Blue', token: 'bgcolor-light-sky-blue-footer', cssVar: '--bgcolor-light-sky-blue-footer' },
  { label: 'Sky Blue', token: 'bgcolor-sky-blue-footer', cssVar: '--bgcolor-sky-blue-footer' },
];

/* ===============================
   TEXT COLORS
   =============================== */
const textColors = [
  { label: 'True Black', token: 'fontcolor-true-black', cssVar: '--fontcolor-true-black' },
  { label: 'Gray 90', token: 'fontcolor-gray-90', cssVar: '--fontcolor-gray-90' },
  { label: 'Gray 80', token: 'fontcolor-gray-80', cssVar: '--fontcolor-gray-80' },
  { label: 'Gray 70', token: 'fontcolor-gray-70', cssVar: '--fontcolor-gray-70' },
  { label: 'Gray 60', token: 'fontcolor-gray-60', cssVar: '--fontcolor-gray-60' },
  { label: 'Gray 50', token: 'fontcolor-gray-50', cssVar: '--fontcolor-gray-50' },
  { label: 'Gray 40', token: 'fontcolor-gray-40', cssVar: '--fontcolor-gray-40' },
];

/* ===============================
   INIT
   =============================== */
async function init() {
  let actions = null;

  try {
    const sdk = await DA_SDK;
    actions = sdk.actions;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Sidekick SDK not available');
  }

  function renderColors(containerId, colors, outputKey) {
    const container = document.getElementById(containerId);
    if (!container) return;

    colors.forEach((color) => {
      const swatch = document.createElement('button');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = `var(${color.cssVar})`;
      swatch.title = color.label;

      swatch.addEventListener('click', () => {
        if (!actions) return;

        actions.sendHTML(`[${outputKey}=${color.token}]`);

        actions.closeLibrary();
      });

      container.appendChild(swatch);
    });
  }

  renderColors('bg-colors', bgColors, 'background-color');
  renderColors('text-colors', textColors, 'font-color');
}

init();
