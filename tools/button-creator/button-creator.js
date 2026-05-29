// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

(async function init() {
  const { actions } = await DA_SDK;

  const buttonsContainer = document.getElementById('buttons-container');

  const buttonTypes = [
    {
      name: 'Primary',
      className: '',
      placeholder: '<strong><a href="https://example.com">Button Text</a></strong>',
    },
    {
      name: 'Secondary',
      className: 'secondary',
      placeholder: '<em><a href="https://example.com">Button Text</a></em>',
    },
    {
      name: 'Primary Disabled',
      className: 'disabled',
      placeholder: '<del class="button-container"><strong><a href="https://example.com" class="button primary disabled">Button Text</a></strong></del>',
    },
    {
      name: 'Secondary Disabled',
      className: 'disabled',
      placeholder: '<em><a href="https://example.com" class="button secondary disabled">Button Text</a></em>',
    },
    {
      name: 'Standard',
      className: 'standard',
      placeholder: '<a href="https://example.com">Button Text</a>',
    },
  ];

  buttonTypes.forEach((buttonType) => {
    const button = document.createElement('button');
    button.textContent = buttonType.name;
    if (buttonType.className) {
      button.className = buttonType.className;
    }
    button.addEventListener('click', () => {
      actions.sendHTML(buttonType.placeholder);
      actions.closeLibrary();
    });
    buttonsContainer.appendChild(button);
  });
}());
