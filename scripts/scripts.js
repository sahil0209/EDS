import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  getMetadata,
  decorateBlock,
  fetchPlaceholders,
} from './aem.js';
import embedSweepstakes from '../utils/sweepstakes.js';
// eslint-disable-next-line import/no-cycle
import { loadFragment } from '../blocks/fragment/fragment.js';
import { createElement } from '../utils/dom.js';
import { parseDate } from '../utils/date.js';

const BLOG_INDEX_LIMIT = 500;
const EXTERNAL_LINK_MODAL_PATH = '/modals/external-links';

/**
 * Looks up the clicked URL in site-config internal-links sheet.
 * @param {string} link Absolute href of the clicked link
 * @returns {Promise<{ matched: boolean, openInNewTab: boolean }>}
 */
async function getInternalLinksMatch(link) {
  const config = await fetch('/site-config.json');
  const configJson = await config.json();
  const { data = [] } = configJson;
  const linkLower = link.toLowerCase();
  const row = data.find((r) => r?.url && linkLower.includes(String(r.url).toLowerCase()));
  if (!row) {
    return { matched: false, openInNewTab: false };
  }
  const newTabRaw = row.newtab ?? row.Newtab ?? row.NEWTAB ?? '';
  const openInNewTab = String(newTabRaw).trim().toUpperCase() === 'Y';
  return { matched: true, openInNewTab };
}

/**
 * Fetches the full blog index data and caches it in window.blogIndex.
 * @returns {Promise<Array<object>>}
 */
async function fetchBlogIndex() {
  // Return cached data if available
  if (window.blogIndex) {
    return window.blogIndex;
  }
  const url = new URL('/blog-index.json', window.location.origin);
  // fetch plenty to cover all entries
  url.searchParams.set('limit', BLOG_INDEX_LIMIT);
  url.searchParams.set('offset', '0');

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Failed to load blog index');
  const json = await response.json();
  const { data = [] } = json;
  // normalize entries
  const normalized = data
    .filter((row) => row && row.path && row.template === 'blog-post')
    .map((row) => ({
      path: row.path,
      title: row.title,
      description: row.description,
      image: row.image,
      tags: Array.isArray(row.tags) ? row.tags : [],
      date: row.date == null || row.date === '' ? '' : row.date,
      author: row.author,
      robots: row.robots || '',
    }))
    .filter((row) => !String(row.robots).includes('noindex'));
  // sort desc by publish date (timestamps or strings e.g. "July 27, 2022")
  normalized.sort((a, b) => {
    const tb = parseDate(b.date)?.getTime() ?? 0;
    const ta = parseDate(a.date)?.getTime() ?? 0;
    return tb - ta;
  });
  // Cache the result
  window.blogIndex = normalized;
  window.blogIndexTotalCount = json.total;
  return normalized;
}

/**
 * Fetches the full query index data and caches it in window.queryIndex.
 * @returns {Promise<Array<object>>}
 */
export async function fetchQueryIndex() {
  // Return cached data if available
  if (window.queryIndex) {
    return window.queryIndex;
  }
  const response = await fetch('/query-index.json');
  if (!response.ok) throw new Error('Failed to load query index');
  const json = await response.json();
  const { data = [] } = json;
  // normalize entries
  const normalized = data
    .map((row) => ({
      path: row.path,
      title: row.title,
      description: row.description,
      image: row.image,
      tags: Array.isArray(row.tags) ? row.tags : [],
      date: row.date || '',
      author: row.author,
      robots: row.robots || '',
      template: row.template,
    }))
    .filter((row) => !String(row.robots).includes('noindex'));
  // Cache the result
  window.queryIndex = normalized;
  return normalized;
}

/**
 * Fetches race metadata from a JSON URL and normalizes field names
 * @param {string} url - The URL to fetch race metadata from
 * @param {object} baseCategory - The base category object to inherit properties from
 * @returns {Promise<Array<object>|null>} Array of normalized category entries or null on error
 */
async function fetchRaceMetadata(url, baseCategory) {
  try {
    let fetchUrl = url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      fetchUrl = urlObj.pathname;
    }
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to fetch race metadata from ${url}`);
      return null;
    }
    const json = await response.json();
    const { data = [] } = json;

    const fieldMap = {
      'Category ID': 'categoryId',
      'Category Name': 'categoryName',
      'Start Date': 'startDate',
      'End Date': 'endDate',
      Price: 'price',
      'Registration Link': 'registrationLink',
      'Category Image': 'categoryImage',
      'Status Override': 'statusOverride',
    };

    return data.map((row) => {
      const normalizedRow = { ...baseCategory };
      delete normalizedRow.raceMetadata;

      Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = fieldMap[key] || key;
        if (value !== '' && value !== null && value !== undefined) {
          normalizedRow[normalizedKey] = value;
        }
      });

      return normalizedRow;
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Error fetching race metadata from ${url}:`, error);
    return null;
  }
}

/**
 * Fetches the full event data and caches it in window.eventData.
 * @returns {Promise<Array<object>>}
 */
export async function fetchEventData() {
  if (window.eventData) {
    return window.eventData;
  }

  const indexPath = window.location.pathname.includes('/drafts/events') ? '/events-test-index.json' : '/events-index.json';

  const response = await fetch(indexPath);
  if (!response.ok) throw new Error('Failed to load events index');
  const json = await response.json();
  const { data = [] } = json;

  const cleanObject = (obj) => Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  );

  const eventRows = data.filter((row) => row.template && row.template.toLowerCase() === 'event');

  const parentEvents = eventRows
    .filter((row) => !eventRows.some((parent) => row.path.startsWith(`${parent.path}/`) && parent.path !== row.path))
    .map((row) => ({
      ...cleanObject(row),
      categories: [],
    }));

  const events = await Promise.all(parentEvents.map(async (parent) => {
    const children = eventRows.filter((row) => row.path.startsWith(`${parent.path}/`)
      && row.path !== parent.path
      && (row.categoryName || row.raceMetadata));

    const expandedChildren = await Promise.all(children.map(async (child) => {
      if (child.raceMetadata) {
        const raceData = await fetchRaceMetadata(child.raceMetadata, child);
        if (raceData && raceData.length > 0) {
          return raceData;
        }
      }
      return [child];
    }));

    return {
      ...parent,
      categories: expandedChildren.flat(),
    };
  }));

  window.eventData = events;
  return events;
}

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  if (!h1) {
    return;
  }

  const section = h1.closest('div');

  const firstSection = main.querySelector(':scope > div');
  if (section !== firstSection) {
    return;
  }

  const picture = section.querySelector('picture');
  if (!picture) {
    return;
  }

  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const elems = [...section.children];
    const filtered = elems.filter((el) => !el.classList.contains('section-metadata') && !el.classList.contains('alert'));
    const block = buildBlock('hero', { elems: filtered });
    section.append(block);
  }
}

/**
 * Builds all video blocks in a container element.
 * @param {Element} main The container element
 */
function buildVideoBlocks(main) {
  const mp4Videos = main.querySelectorAll('a[href$=".mp4"]');
  const youtubeVideos = main.querySelectorAll('a[href*="youtube.com"], a[href*="youtu.be"]');
  const allVideos = [...mp4Videos, ...youtubeVideos];

  allVideos.forEach((video) => {
    if (video.closest('.video.block')) return;
    if (video.querySelector('.icon')) return;

    const parent = video.parentElement;
    if (parent?.tagName !== 'P') return;

    const hasOnlyVideo = Array.from(parent.childNodes).every((node) => {
      if (node === video) return true;
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '') return true;
      return false;
    });

    if (!hasOnlyVideo) return;

    const videoBlock = buildBlock('video', video.cloneNode(true));
    video.replaceWith(videoBlock);
    decorateBlock(videoBlock);
  });
}

/**
 * Replaces a paragraph with a built block.
 * @param link a link.
 * @param block a block.
 */
function replaceParagraphWithBlock(link, block) {
  const parent = link.parentElement;
  if (parent && parent.tagName === 'P' && parent.children.length === 1) {
    parent.replaceWith(block);
  } else {
    link.replaceWith(block);
  }
}

/**
 * Builds a fragment given a link element.
 * @param link the link.
 */
export function buildFragment(link) {
  const block = buildBlock('fragment', link.cloneNode(true));
  replaceParagraphWithBlock(link, block);
  decorateBlock(block);
}

function handleExternalLinks(element) {
  element.addEventListener('click', async (e) => {
    if (e.defaultPrevented) {
      return;
    }
    const origin = e.target.closest('a');
    if (origin && origin.href) {
      if (origin.href.startsWith('tel:') || origin.href.startsWith('mailto:')) {
        return;
      }
      e.preventDefault();
      const { matched, openInNewTab } = await getInternalLinksMatch(origin.href);
      if (!matched) {
        // external modal link
        const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
        openModal(`${EXTERNAL_LINK_MODAL_PATH}`, origin.href);
      } else if (openInNewTab) {
        // internal-links row with newtab=Y: no modal, open in new tab
        window.open(origin.href, '_blank', 'noopener,noreferrer');
      } else {
        // continue to original link (same tab)
        window.location.href = origin.href;
      }
    }
  });
}

function autolinkModals(element) {
  element.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');
    if (origin && origin.href) {
      const { hostname } = window.location;
      if (origin.href.startsWith('tel:') || origin.href.startsWith('mailto:')) {
        return;
      }

      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      if (origin.href.includes(hostname) && origin.href.includes('/modals/')) {
        // standard modal link
        openModal(origin.href);
      }
    }
  });
}

function openMobileModal(contentDiv) {
  const originalParent = contentDiv.parentNode;

  const placeholder = document.createComment('extra-content-placeholder');
  originalParent.insertBefore(placeholder, contentDiv.nextSibling);

  // Create overlay + modal
  const modalOverlay = createElement('div', { class: 'extra-modal-overlay' });
  const modalContainer = createElement('div', { class: 'extra-modal-content' });

  // Create back button bar (replaces X)
  const backBar = createElement('div', { class: 'mobile-back-bar' });
  backBar.innerHTML = `
    <button class="icon__back-button" aria-label="Go back">
     <i class="pepicon icon__previous"></i>
    </button>
     <div class="mobile-modal-title"></div>
  `;

  modalContainer.appendChild(backBar);
  modalContainer.appendChild(contentDiv);
  modalOverlay.appendChild(modalContainer);
  document.body.appendChild(modalOverlay);

  // Prevent background scroll
  document.body.style.overflow = 'hidden';

  // Try to use the heading inside content as the title
  const heading = contentDiv.querySelector('h2, h3, h4');
  const title = backBar.querySelector('.mobile-modal-title');
  if (heading && title) {
    title.textContent = heading.textContent.trim();
  }

  // Back button close behavior
  const backBtn = backBar.querySelector('.icon__back-button');
  backBtn.addEventListener('click', () => {
    placeholder.parentNode.insertBefore(contentDiv, placeholder);
    placeholder.remove();
    modalOverlay.remove();
    document.body.style.overflow = '';
    contentDiv.style.display = 'none';
    setTimeout(() => {
      contentDiv.style.display = '';
    }, 0);
  }, { once: true });
}

function autolinkInlineModals(element) {
  // Keyboard activation support
  document.addEventListener('keydown', (e) => {
    if (e.key !== ' ') return;

    const link = e.target.closest('a');
    if (!link) return;

    e.preventDefault(); // stops page scroll
  });

  element.addEventListener('keydown', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      link.click(); // triggers same modal logic
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key !== ' ') return;

    const link = e.target.closest('a');
    if (!link) return;

    const p = link.closest('p');

    // Only <p><a>, but NOT <p.primary-link-container>
    if (!p || p.classList.contains('primary-link-container')) return;

    e.preventDefault();
    e.stopPropagation();
    link.click();
  });

  element.addEventListener('click', async (et) => {
    const link = et.target.closest('a');
    if (!link || !link.href) return;

    et.preventDefault();
    et.stopPropagation();

    if (!link.dataset.originalText) {
      link.dataset.originalText = link.textContent.trim();
    }
    const { originalText } = link.dataset;

    const li = link.closest('li');
    const ul = li?.closest('ul');

    if (!li || !ul) return;

    const url = link.getAttribute('href');
    const isMobile = window.innerWidth < 768;

    // ---- FIXED: detect if already open (desktop only) ----
    const existing = ul.nextElementSibling;
    if (
      existing
      && existing.classList.contains('extra-content')
      && existing.dataset.linkHref === url
    ) {
      existing.remove();
      link.textContent = originalText;
      link.setAttribute('aria-label', originalText); // <-- ADD THIS
      return;
    }

    // Close all other extra contents
    document.querySelectorAll('.extra-content').forEach((div) => div.remove());
    document.querySelectorAll('.cards .primary-link').forEach((other) => {
      if (other !== link) {
        other.textContent = other.dataset.originalText || other.textContent;
      }
    });

    // Create container
    const extraContentDiv = document.createElement('div');
    extraContentDiv.className = 'extra-content';
    extraContentDiv.dataset.linkHref = url;
    extraContentDiv.innerHTML = '<i class="icon__close-button icon"></i>';
    extraContentDiv.setAttribute('tabindex', '-1');

    // Toggle text
    if (!isMobile) {
      link.textContent = 'View Less';
      link.setAttribute('aria-label', 'View Less');
    } else {
      link.textContent = originalText;
      link.setAttribute('aria-label', originalText);
    }

    // Insert location
    if (!isMobile) {
      ul.parentNode.insertBefore(extraContentDiv, ul.nextSibling);
    } else {
      document.body.appendChild(extraContentDiv);
    }

    // Close button logic
    function attachClose(div) {
      const btn = div.querySelector('.icon__close-button');
      if (!btn) return;
      btn.addEventListener(
        'click',
        () => {
          div.remove();
          link.textContent = originalText;
          link.setAttribute('aria-label', originalText); // <-- ADD THIS
          link.focus(); // return focus
        },
        { once: true },
      );
    }

    attachClose(extraContentDiv);

    // === ESC SHOULD CLOSE DIALOG USING SAME LOGIC ===
    extraContentDiv.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const btn = extraContentDiv.querySelector('.icon__close-button');
        if (btn) {
          btn.click(); // <-- exact same close flow as clicking X
        }
      }
    });

    // --- ARROW POSITION FIX ---
    function positionArrow() {
      const linkRect = link.getBoundingClientRect();
      const contentRect = extraContentDiv.getBoundingClientRect();

      const offset = linkRect.left + linkRect.width / 2 - contentRect.left;

      const percent = (offset / contentRect.width) * 100;

      extraContentDiv.style.setProperty('--arrow-left', `${percent}%`);
    }

    // Fetch modal content
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load');
      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const mainContent = doc.querySelector('main')?.innerHTML || '<p>No content found</p>';

      extraContentDiv.innerHTML = `
        <i class="icon__close-button icon"></i>
        ${mainContent}
      `;

      // === ACCESSIBLE DIALOG: JS-only ===
      extraContentDiv.setAttribute('role', 'dialog');
      extraContentDiv.setAttribute('aria-modal', 'true');
      extraContentDiv.setAttribute('tabindex', '-1');

      // Find dialog heading (your <h4 id="member-welcome-kit">…)
      const dialogHeading = extraContentDiv.querySelector('h1, h2, h3, h4, h5, h6');
      if (dialogHeading) {
        if (!dialogHeading.id) {
          dialogHeading.id = `dialog-title-${Math.random().toString(36).slice(2)}`;
        }
        extraContentDiv.setAttribute('aria-labelledby', dialogHeading.id);
      }

      // === MAKE CLOSE ICON FOCUSABLE ===
      const closeIcon = extraContentDiv.querySelector('.icon__close-button');
      closeIcon.setAttribute('role', 'button');
      closeIcon.setAttribute('tabindex', '0');
      closeIcon.setAttribute('aria-label', `${dialogHeading.textContent.trim()} close dialog`);
      closeIcon.focus();
      // ⭐ KEY FIX: focus ONLY the close button
      requestAnimationFrame(() => {
        closeIcon.focus();
      });

      closeIcon.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          closeIcon.click();
        }
      });
      attachClose(extraContentDiv);

      // ----- FOCUS FIRST INTERACTIVE ELEMENT -----
      const focusableSelectors = 'button, a[href], textarea, input, select, [tabindex]:not([tabindex="-1"])';

      const focusableElements = Array.from(
        extraContentDiv.querySelectorAll(focusableSelectors),
      ).filter((el) => !el.disabled && el.offsetParent !== null);

      // Always focus the close button first
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        extraContentDiv.focus();
      }

      // ----- MINIMAL FOCUS TRAP: ONLY IF ONE ELEMENT (X BUTTON) -----
      extraContentDiv.addEventListener('keydown', (evt) => {
        // ESC closes
        if (evt.key === 'Escape') {
          const btn = extraContentDiv.querySelector('.icon__close-button');
          if (btn) btn.click();
          return;
        }

        // Only care about TAB
        if (evt.key !== 'Tab') return;

        const elements = Array.from(
          extraContentDiv.querySelectorAll(focusableSelectors),
        ).filter((el) => !el.disabled && el.offsetParent !== null);

        // If ONLY the close button is focusable → trap focus on it
        if (elements.length > 0) {
          const first = elements[0];
          const last = elements[elements.length - 1];

          if (evt.shiftKey && document.activeElement === first) {
            evt.preventDefault();
            last.focus();
          } else if (!evt.shiftKey && document.activeElement === last) {
            evt.preventDefault();
            first.focus();
          }
        }
      });

      if (isMobile) {
        openMobileModal(extraContentDiv);
      } else {
        requestAnimationFrame(() => positionArrow());
      }
    } catch (err) {
      extraContentDiv.innerHTML = `
        <i class="icon__close-button icon"></i>
        <p>Error loading content</p>
      `;
      attachClose(extraContentDiv);
    }
  });
}

/**
 * Generates and sets a meaningful aria-label for an element based on
 * its title, context (headings), or internal text.
 */
export function setContextualAriaLabel(el, main) {
  if (el.getAttribute('aria-label')) return;
  const titleAttr = el.getAttribute('title');
  if (titleAttr) {
    el.setAttribute('aria-label', titleAttr.trim());
    return;
  }
  const internalTitle = el.querySelector('h1, h2, h3, h4, h5, h6, .title, strong, [class*="title"]');
  if (internalTitle) {
    el.setAttribute('aria-label', internalTitle.textContent.trim());
    return;
  }
  const elText = el.textContent.trim();
  const isUrl = /^(http|https):\/\//i.test(elText);

  if (elText && !isUrl) {
    let heading = null;
    let current = el;
    while (current && current !== main && !heading) {
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.matches('h1, h2, h3, h4, h5, h6, strong')) {
          heading = sibling;
          break;
        }
        sibling = sibling.previousElementSibling;
      }
      if (!heading) current = current.parentElement;
    }

    if (heading && (heading.textContent.trim().toLowerCase() === elText.toLowerCase()
      || heading.contains(el))) {
      heading = null;
    }

    if (heading) {
      el.setAttribute('aria-label', `${elText} about ${heading.textContent.trim()}`);
    } else {
      const cleanText = elText.split('\n')[0].trim();
      el.setAttribute('aria-label', cleanText);
    }
  }
}

/**
 * Decorates all links on a given page as fragments or modals based on the path.
 * @param {Element} main
 */
export function decorateLinks(main) {
  main.querySelectorAll('a').forEach((link) => {
    // Active page detection
    if (link.href === window.location.href) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
    const { hostname } = window.location;
    if (link.href.includes(hostname)) {
      // fragments
      if (link.href.includes('/fragments/')) {
        loadFragment(buildFragment(link));
      }
      // modals
      if (link.href.includes('/modals/')) {
        autolinkModals(link);
      }
      if (link.href.includes('/inline-modals/')) {
        autolinkInlineModals(link);
      }
    } else {
      // external links
      handleExternalLinks(link);
    }

    // Call the ARIA function for links
    setContextualAriaLabel(link, main);

    // New condition: Handle buttons and icons specifically
    main.querySelectorAll('button, .icon, i[class^="icon-"], [role="link"], [role="radio"], [role="button"]').forEach((el) => {
      setContextualAriaLabel(el, main);
    });
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
    buildVideoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}
function decorateSectionBackgrounds() {
  document.querySelectorAll('.section[data-background], .section[data-background-image], .section[data-accent-stroke-link]').forEach((section) => {
    const { background, backgroundImage, accentStrokeLink } = section.dataset;
    const isWallpaper = section.querySelector('.digital-wallpaper-downloads');

    if (background && !isWallpaper) {
      section.style.background = background;
    }

    if (backgroundImage) {
      section.style.backgroundImage = `url(${backgroundImage})`;
    }

    if (accentStrokeLink) {
      section.querySelectorAll('a.primary-link').forEach((link) => {
        link.style.backgroundImage = `url(${accentStrokeLink})`;
      });
    }
  });
}

function applyHeadingUnderlineStyles(root) {
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    heading.querySelectorAll('code').forEach((el) => {
      el.style.fontFamily = 'inherit';
      el.style.background = 'transparent';
      el.style.color = 'rgb(0,113,208)';
      el.style.padding = '0';
    });
  });
}

function decorateIconFrameSections(main) {
  main.querySelectorAll('.section.icon-frame').forEach((section) => {
    if (section.querySelector('.section-icon')) return;

    const iconType = section.getAttribute('data-icon');
    if (!iconType) return;

    const iconDiv = document.createElement('div');
    iconDiv.className = 'section-icon';
    iconDiv.innerHTML = `<i class="icon__${iconType} icon"></i>`;

    section.insertBefore(iconDiv, section.firstChild);
  });
}
/**
 * Sets up scroll-based animations for sections with the animate class
 * @param {Element} main The container element
 */
function setupScrollAnimations(main) {
  const animateSections = main.querySelectorAll('.section.animate');

  if (animateSections.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px',
  });

  animateSections.forEach((section) => {
    observer.observe(section);
  });
}

export function decorateFourthButtons(main) {
  main.querySelectorAll('.button-container a').forEach((button) => {
    const hasUnderline = button.querySelector('u');
    if (hasUnderline) {
      button.classList.add('fourth');
    }
  });
}

/**
 * Replaces ${key} placeholders with values from localStorage persistedData
 * @param {Element} main The container element
 */
function replacePersistedDataPlaceholders(main) {
  try {
    // First, check if page contains ${key} placeholders
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    // eslint-disable-next-line no-cond-assign
    while ((node = walker.nextNode())) {
      if (node.textContent.includes('${')) {
        textNodes.push(node);
      }
    }

    // If placeholders exist but persistedData is missing, redirect to parent page
    const persistedDataStr = localStorage.getItem('persistedData');
    if (textNodes.length > 0 && !persistedDataStr) {
      const segments = window.location.pathname.split('/').filter(Boolean);
      segments.pop();
      window.location.href = segments.length ? `/${segments.join('/')}` : '/';
      return;
    }

    if (!persistedDataStr) return;

    const persistedData = JSON.parse(persistedDataStr);
    if (!persistedData || typeof persistedData !== 'object') return;

    textNodes.forEach((textNode) => {
      let text = textNode.textContent;
      Object.keys(persistedData).forEach((key) => {
        const placeholder = `\${${key}}`;
        if (text.includes(placeholder)) {
          text = text.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), persistedData[key] || '');
        }
      });
      if (text !== textNode.textContent) {
        textNode.textContent = text;
      }
    });

    // Delete persistedData from localStorage after use
    localStorage.removeItem('persistedData');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error replacing persisted data placeholders:', e);
  }
}

function checkForFormSubmission() {
  if (!window.location.pathname.includes('connect-with-us/confirmation')) return;
  const firstName = sessionStorage.getItem('firstName');
  if (firstName && firstName !== 'undefined') {
    document.querySelector('.success-data').querySelectorAll('p').forEach((p, index) => {
      if (index === 0) {
        p.textContent = `Hello, ${firstName}:`;
      }
    });
  }
  sessionStorage.removeItem('firstName');
}

export function decorateMain(main) {
  // hopefully forward compatible button decoration
  replacePersistedDataPlaceholders(main);
  decorateButtons(main);
  decorateFourthButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateLinks(main);
  decorateIconFrameSections(main);
  decorateSectionBackgrounds();
  applyHeadingUnderlineStyles(document);
  checkForFormSubmission();
}

/**
 * Loads template specific CSS and CSS without placing all code in global styles/scripts.
 */
export async function loadTemplate(doc, templateName) {
  try {
    const templateNameLower = templateName.toLowerCase();
    const cssLoaded = new Promise((resolve) => {
      loadCSS(
        `${window.hlx.codeBasePath}/templates/${templateNameLower}/${templateNameLower}.css`,
      )
        .then(resolve)
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(
            `failed to load css module for ${templateNameLower}`,
            err.target.href,
          );
          resolve();
        });
    });
    const decorationComplete = new Promise((resolve) => {
      (async () => {
        try {
          const mod = await import(
            `../templates/${templateNameLower}/${templateNameLower}.js`
          );
          if (mod.default) {
            await mod.default(doc);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.log(`failed to load module for ${templateNameLower}`, error);
        }
        resolve();
      })();
    });

    document.body.classList.add(`${templateNameLower}-template`);

    await Promise.all([cssLoaded, decorationComplete]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`failed to load block ${templateName}`, error);
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');

  if (main) {
    // Load crisis messaging fragment early if metadata is enabled
    const crisisMessagingEnabled = getMetadata('crisis-messaging') === 'true';
    if (crisisMessagingEnabled) {
      try {
        const placeholders = await fetchPlaceholders();
        const crisisMessagingPath = placeholders?.crisisMessaging;
        if (crisisMessagingPath) {
          const fragment = await loadFragment(crisisMessagingPath);
          if (fragment) {
            // Get all sections from fragment container
            const fragmentSections = Array.from(fragment.children).filter(
              (child) => child.classList.contains('section'),
            );
            if (fragmentSections.length > 0) {
              // Insert at top of main before other content loads to prevent CLS
              fragmentSections.forEach((section) => {
                section.style.display = '';
                main.insertBefore(section, main.firstChild);
              });
            }
          }
        }
      } catch (error) {
        // Silently fail if crisis messaging can't be loaded
        // eslint-disable-next-line no-console
        console.warn('Failed to load crisis messaging:', error);
      }
    }
    const sweepstakesEnabled = getMetadata('sweepstakes') === 'true';
    if (sweepstakesEnabled) {
      await embedSweepstakes(main);
    }

    decorateMain(main);

    const hasPageLevelAnimate = getMetadata('animate').toLowerCase() === 'true';

    if (hasPageLevelAnimate) {
      const allSections = main.querySelectorAll(':scope > .section');
      [...allSections].forEach((section) => {
        section.classList.add('animate');
      });
    }

    const templateName = getMetadata('template');

    if (templateName) {
      await loadTemplate(doc, templateName);
    }

    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  setupScrollAnimations(main);

  const isEventTemplate = document.body.classList.contains('event-template');

  if (isEventTemplate) {
    // eslint-disable-next-line import/no-cycle
    const { getEventData } = await import('../utils/event.js');
    const eventData = await getEventData();

    if (eventData) {
      if (eventData.eventId) {
        document.body.classList.add(`event-id-${eventData.eventId}`);
      }
    }
  }

  if (window.location.pathname.includes('/fragments/nav')) {
    main.remove();
    document.querySelector('footer').remove();
  }

  if (window.location.pathname.includes('/fragments/footer')) {
    main.remove();
    document.querySelector('header').remove();
  }
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

// Make fetchBlogIndex and fetchEventData available globally
window.fetchBlogIndex = fetchBlogIndex;
window.fetchEventData = fetchEventData;

loadPage();

(async function loadDa() {
  if (!new URL(window.location.href).searchParams.get('dapreview')) return;
  // eslint-disable-next-line import/no-unresolved
  import('https://da.live/scripts/dapreview.js').then(({ default: daPreview }) => daPreview(loadPage));
}());

/**
 *
 * Scrolling function for FAQ page section selection
 */
function scrollIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const targetId = params.get('faq');
  if (!targetId) return;

  const MAX_RETRIES = 30; // ~6 seconds
  const RETRY_DELAY = 200;
  let lastTop = null;
  let attempts = 0;

  const attemptScroll = () => {
    const el = document.getElementById(targetId);
    if (!el) {
      if (attempts < MAX_RETRIES) {
        attempts += 1;
        setTimeout(attemptScroll, RETRY_DELAY);
      }
      return;
    }

    const header = document.querySelector('.header-wrapper, header');
    const headerHeight = header ? header.offsetHeight : 0;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 10;

    // Wait for layout stabilization
    if (lastTop !== null && Math.abs(top - lastTop) < 2) {
      // Use requestAnimationFrame to ensure browser repaint done
      requestAnimationFrame(() => {
        window.scrollTo({ top, behavior: 'smooth' });
      });
      return;
    }

    lastTop = top;
    if (attempts < MAX_RETRIES) {
      attempts += 1;
      setTimeout(attemptScroll, RETRY_DELAY);
    }
  };

  // Wait until window.onload + small buffer
  window.addEventListener('load', () => {
    // Give AEM fragments a moment to render
    setTimeout(attemptScroll, 600);
  });
}
function announceThankYouMessage() {
  const heading = document.querySelector('#thank-you');
  const message = document.querySelector('.thank-you-message');

  // Ensure heading announces first
  if (heading) {
    heading.setAttribute('aria-live', 'assertive');

    setTimeout(() => heading.focus(), 200); // JAWS/NVDA timing fix
  }

  // Announce message second (optional and delayed)
  if (message) {
    message.setAttribute('aria-live', 'assertive');

    setTimeout(() => message.focus(), 200);
  }
}
scrollIdFromUrl();

/**
 * Adds aria-hidden="true" to all decorative icons inside a block.
 * Matches:
 *  - .icon
 *  - classes containing "icon__"
 *  - classes containing "icon-"
 */
export function hideDecorativeIcons(...selectors) {
  selectors.forEach((selector) => {
    if (!selector) return;

    const icons = document.querySelectorAll(selector);

    icons.forEach((icon) => {
      icon.setAttribute('aria-hidden', 'true');
    });
  });
}

/**
 * Adds aria-hidden="true" to all decorative icons inside a block.
 * Matches:
 *  - .icon
 *  - classes containing "icon__"
 *  - classes containing "icon-"
 */
export function hideDecorativeIconsInBlock(block) {
  if (!block) return;

  const icons = [...block.querySelectorAll(
    '.icon, i, [class*="icon__"], [class*="icon-"]',
  )].filter((icon) => !icon.classList.contains('icon-separator'));

  // Remove focus landing on bullets (do once, not per icon)
  block.querySelectorAll('ul li').forEach((li) => {
    li.setAttribute('tabindex', '-1');
  });

  icons.forEach((icon) => {
    icon.setAttribute('aria-hidden', 'true');

    const parentP = icon.closest('p');
    if (
      parentP
      && parentP.children.length === 1
      && parentP.textContent.trim() === ''
    ) {
      parentP.setAttribute('aria-hidden', 'true');
    }
  });
}
window.addEventListener('load', () => {
  hideDecorativeIconsInBlock(document);
  const pageMeta = getMetadata('page');
  if (pageMeta && pageMeta.toLowerCase() === 'thank-you') {
    announceThankYouMessage();
  }
});
