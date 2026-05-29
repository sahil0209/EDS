/**
 * Formats a string to IC_ format with uppercase and underscores
 * Total length (including prefix) must be less than 100 characters
 * If it exceeds 100, extra characters are removed from the end
 * @param {string} str - The input string to format
 * @param {string} [prefix='IC_'] - The prefix to use (defaults to 'IC_')
 * @returns {string} - Formatted string with prefix
 */
function formatToICPrefix(str, prefix = 'IC_') {
  if (!str || typeof str !== 'string') {
    return prefix || 'IC_';
  }

  // Convert to uppercase and replace spaces/special chars with underscores
  let formatted = str
    .trim()
    .toUpperCase()
    // Replace spaces and common special characters with underscores
    .replace(/[\s\-./\\:]+/g, '_')
    // Replace multiple consecutive underscores with a single underscore
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '');

  // Add prefix
  let result = prefix + formatted;

  // If total length exceeds 100, truncate from the end
  if (result.length > 100) {
    // Calculate how many characters we can keep after the prefix
    const maxLength = 100 - prefix.length;
    // Truncate the formatted string to fit within the limit
    formatted = formatted.substring(0, maxLength);
    // Remove any trailing underscore that might have been created
    formatted = formatted.replace(/_+$/, '');
    result = prefix + formatted;
  }

  return result;
}

/**
 * Checks if a URL is external to the current domain
 * @param {string} url - The URL to check
 * @returns {boolean} - True if the URL is external
 */
function isExternalUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Skip special protocol links
  // eslint-disable-next-line no-script-url
  if (url.startsWith('tel:') || url.startsWith('mailto:') || url.startsWith('#') || url.startsWith('javascript:')) {
    return false;
  }

  try {
    const linkUrl = new URL(url, window.location.href);
    const currentHost = window.location.hostname;
    return linkUrl.hostname !== currentHost && linkUrl.hostname !== '';
  } catch (e) {
    // If URL parsing fails, assume it's not external
    return false;
  }
}

/**
 * Finds the closest heading tag (h1-h6) relative to an element
 * Priority: sibling headings in same container > parent's sibling headings >
 * parent headings (skip if element is inside heading)
 * @param {HTMLElement} element - The element to find the closest heading for
 * @returns {string} - The text content of the closest heading, or empty string if not found
 */
export function findClosestHeading(element) {
  // First, check if element is inside a heading - if so, we want to find
  // sibling headings, not the parent heading
  const parentHeading = element.closest('h1, h2, h3, h4, h5, h6');

  // Start from the element's immediate parent
  let current = element.parentElement;

  while (current && current !== document.body) {
    // Check siblings of current element (these are siblings of the element's parent)
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const currentIndex = siblings.indexOf(current);

      // Check previous siblings first (more likely to be the relevant heading)
      for (let i = currentIndex - 1; i >= 0; i -= 1) {
        const sibling = siblings[i];
        // If sibling is a heading, return it (this finds h3 when link is in h6)
        if (sibling.tagName && /^H[1-6]$/i.test(sibling.tagName)) {
          return sibling.textContent || sibling.innerText || '';
        }
        // Check for headings inside the sibling
        const nestedHeading = sibling.querySelector('h1, h2, h3, h4, h5, h6');
        if (nestedHeading) {
          return nestedHeading.textContent || nestedHeading.innerText || '';
        }
      }

      // Check next siblings (in case heading comes after)
      for (let i = currentIndex + 1; i < siblings.length; i += 1) {
        const sibling = siblings[i];
        if (sibling.tagName && /^H[1-6]$/i.test(sibling.tagName)) {
          return sibling.textContent || sibling.innerText || '';
        }
      }
    }

    // If we haven't found a sibling heading, check if current parent is a heading
    // But skip if the element itself is inside a heading (we want sibling, not parent)
    if (!parentHeading && current.tagName && /^H[1-6]$/i.test(current.tagName)) {
      return current.textContent || current.innerText || '';
    }

    // Move up to parent
    current = current.parentElement;
  }

  return '';
}

/**
 * Cleans text by replacing spaces and special characters with hyphens
 * @param {string} text - The text to clean
 * @returns {string} - Cleaned text with hyphens
 */
export function cleanTextWithHyphens(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '-') // Replace special characters with hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Cleans heading text by replacing spaces and special characters with hyphens
 * @param {string} headingText - The heading text to clean
 * @returns {string} - Cleaned heading text with hyphens
 */
export function cleanHeadingText(headingText) {
  return cleanTextWithHyphens(headingText);
}

/**
 * Processes link text with heading context: both heading and link text use hyphens
 * @param {string} linkText - The original link text
 * @param {string} headingText - Optional heading text to prepend
 * @returns {string} - Processed link text with heading context (both with hyphens)
 */
export function processLinkTextWithHeading(linkText, headingText = '') {
  let processedLinkText = linkText;
  if (!processedLinkText || typeof processedLinkText !== 'string') {
    processedLinkText = '';
  }

  // Clean link text: replace spaces and special characters with hyphens
  const cleanLinkText = cleanTextWithHyphens(processedLinkText);

  // Clean and prepend heading text if provided
  if (headingText) {
    const cleanHeading = cleanTextWithHyphens(headingText);
    if (cleanHeading && cleanLinkText) {
      return `${cleanHeading}-${cleanLinkText}`;
    }
  }

  return cleanLinkText;
}

export default formatToICPrefix;
export { isExternalUrl };
