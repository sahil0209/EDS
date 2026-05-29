/**
 * create an element.
 * @param {string} tagName the tag for the element
 * @param {object} props properties to apply
 * @param {string|Element} html content to add
 * @returns the element
 */
const createElement = (tagName, props, html) => {
  const elem = document.createElement(tagName);
  if (props) {
    Object.keys(props).forEach((propName) => {
      const val = props[propName];
      if (propName === 'class') {
        const classesArr = typeof val === 'string' ? val.split(' ') : val;
        const filteredClasses = classesArr.filter((cls) => cls && cls.trim() !== '');
        if (filteredClasses.length > 0) {
          elem.classList.add(...filteredClasses);
        }
      } else {
        elem.setAttribute(propName, val);
      }
    });
  }

  if (html) {
    const appendEl = (el) => {
      if (el instanceof HTMLElement || el instanceof SVGElement) {
        elem.append(el);
      } else {
        elem.insertAdjacentHTML('beforeend', el);
      }
    };

    if (Array.isArray(html)) {
      html.forEach(appendEl);
    } else {
      appendEl(html);
    }
  }

  return elem;
};

const createIcon = (iconName, size) => createElement('i', { class: [`icon__${iconName}`, 'icon', ...(size ? [`size-${size}`] : [])] });

export { createElement, createIcon };
