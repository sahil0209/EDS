// add delayed functionality here
/* global WDPRO */

// import { loadScript } from './aem.js';
import {
  findClosestHeading,
  processLinkTextWithHeading,
  cleanTextWithHyphens,
} from '../utils/analyticsModifier.js';
// import isLowerEnv from '../utils/envs.js';

function flattenObject(obj, parentKey = '', result = {}) {
  Object.entries(obj).forEach(([key, value]) => {
    const newKey = parentKey ? `${parentKey}.${key}` : key;

    if (Array.isArray(value)) {
      // ✅ Handle array of objects
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          flattenObject(item, `${newKey}[${index}]`, result);
        } else {
          result[`${newKey}[${index}]`] = item;
        }
      });
    } else if (value && typeof value === 'object') {
      flattenObject(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  });

  return result;
}

/**
 * Adds name attribute and click tracking to all <a> tags
 * Name attribute format: &lid=RN_{pageType}_{linkText}
 * RN is static, pageType from URL path (1st segment), linkText is cleaned HTML text
 */
function setupLinkTracking() {
  // Get page type from URL path - extract 1st segment after root
  // e.g., /events/disneyworld/... -> 'events'
  const pathSegments = window.location.pathname.split('/').filter((segment) => segment);
  const pageType = pathSegments.length > 0 ? pathSegments[0].toLowerCase() : 'homepage';

  // Process all anchor tags
  document.querySelectorAll('a').forEach((link) => {
    // Skip if element has blog-home-clear-filters class
    if (link.classList.contains('blog-home-clear-filters')) {
      return;
    }

    // Always evaluate link text first
    let linkTexts = '';
    const tempDivs = document.createElement('div');
    tempDivs.innerHTML = link.innerHTML;
    linkTexts = tempDivs.textContent || tempDivs.innerText || '';
    linkTexts = linkTexts.trim();

    // 🔥 CUSTOM OVERRIDE RULE
    if (linkTexts === 'Register Now') {
      link.setAttribute(
        'name',
        '&lid=DYP_ProgramsGradNiteDisneyland_ICFullWidthCTA_RegisterNow',
      );
    } else if (!link.hasAttribute('name')) {
      // Get link text and clean it
      let linkText = '';

      // Get text content, removing HTML tags and extra whitespace
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = link.innerHTML;
      linkText = tempDiv.textContent || tempDiv.innerText || '';

      // Find the closest heading and process link text with heading context
      // Skip heading text if link is inside .footer-links
      const isInFooterLinks = link.closest('.footer-links');
      if (isInFooterLinks) {
        // For footer links, just clean the link text without heading context
        linkText = cleanTextWithHyphens(linkText);
      } else {
        const headingText = findClosestHeading(link);
        linkText = processLinkTextWithHeading(linkText, headingText);
      }

      // If no text content, try to use title or href as fallback
      if (!linkText) {
        linkText = link.title || link.getAttribute('aria-label') || 'Link';
        linkText = linkText
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, ' ')
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('')
          .replace(/\s/g, '');
      }

      // Set the name attribute with format: &lid=RN_{pageType}_{linkText}
      if (linkText) {
        link.setAttribute('name', `&lid=IC_${pageType}_${linkText}`);
      }
    }

    // Add click tracking
    link.addEventListener('click', function handleLinkClick() {
      if (window.s_wdpro && typeof window.s_wdpro.trackClick === 'function') {
        window.s_wdpro.trackClick(this);
      }
    });
  });
}

// Setup link tracking (name attributes and click tracking)
setupLinkTracking();

(async () => {
  // add martech tags to the page
  // await loadScript(`https://${isLowerEnv() ? 'stage.' : ''}go4.disney.go.com/`);
  // // delay remaining initialization by 3 seconds
  // await new Promise((resolve) => {
  //   setTimeout(resolve, 3000);
  // });

  // pathSegments
  const pathSegments = window.location.pathname.split('/').filter((segment) => segment);
  // Calculate pageId: last path segment, or "home" if path is empty or just "/"
  let pageId = 'home';
  if (pathSegments.length > 0) {
    pageId = pathSegments[pathSegments.length - 1];
  }

  // Calculate siteSections: "content" + pathname without last segment
  let siteSections = 'content';
  if (pathSegments.length > 1) {
    // Get all segments except the last one
    const pathWithoutLast = pathSegments.slice(0, -1).join('/');
    siteSections = `content/${pathWithoutLast}`;
  }

  const DFTWH = [];

  // Determine report suite based on origin
  const { origin } = window.location;
  const reportSuiteId = origin === 'https://www.disneycampus.com'
    ? 'wdgwdprodyp,wdgwdprosec,wdgsec'
    : 'wdgwdprodypdev,wdgwdprosecdev';

  DFTWH.data = {
    utils: {
      baseURI: 'https://www.disneycampus.com',
      title: 'Disney Imagination Campus',
      mediaEngineUrl: 'https://cdn1.parksmedia.wdprapps.disney.com/media/flashComponents/mediaEngine/',
      cdnUrl: 'https://cdn2.parksmedia.wdprapps.disney.com/media/dftwh/v/734.0.0.0/',
    },
    footer: {
      src: '//a.dilcdn.com/g/us/home/footer.js',
      color: 'light',
      copyright: '© Disney. All rights reserved.',
    },
    analytics: {
      pageId,
      siteSections,
      site: 'DYP',
      reportSuiteId,
      configuration: [],
      properties: [],
    },
  };

  const model = {
    configuration: {
      SiteCatalyst: {
        reportSuiteId: DFTWH.data.analytics.reportSuiteId,
        SiteCatalyst: { turnOff: true },
      },
    },
    pageId: DFTWH.data.analytics.pageId,
    siteSection: DFTWH.data.analytics.siteSections,
    site: DFTWH.data.analytics.site,
  };

  if (DFTWH.data.searchAnalyticsProperties !== undefined) {
    model.internalSearchKeywords = DFTWH.data.searchAnalyticsProperties.prop7;
    model.internalSearchType = DFTWH.data.searchAnalyticsProperties.eVar5;
    model.events = 'event2';
    model.internalSearchNumResults = DFTWH.data.searchAnalyticsProperties.prop8;
    model.linkId = DFTWH.data.searchAnalyticsProperties.prop9;
  }

  const path = window.location.pathname.toLowerCase();

  if (path.includes('/connect-with-us') && path.includes('confirmation')) {
    let storedData = {};

    try {
      storedData = JSON.parse(sessionStorage.getItem('cw_form_data')) || {};
    } catch (e) {
      storedData = {};
    }

    if (Object.keys(storedData).length) {
      const flatData = flattenObject(storedData);

      const excludedKeys = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'form_code', // ✅ ADD THIS
      ];

      const filteredData = Object.fromEntries(
        Object.entries(flatData).filter(([key, value]) => {
          const lowerKey = key.toLowerCase();

          const isExcluded = excludedKeys.some((ex) => lowerKey.includes(ex));

          const isEmpty = value === ''
            || value === null
            || value === undefined;

          return !isExcluded && !isEmpty;
        }),
      );

      // eVar13 → key=value
      model.eVar13 = `CP:${Object.entries(filteredData)
        .map(([key, value]) => `${key}=${value}`)
        .join('|')}`;

      // eVar14 → values only
      model.eVar14 = Object.values(filteredData).join(',');

      const evar23Value = sessionStorage.getItem('cw_analytics_id') || 'DYP_Connect_With_Us';

      // eVar23 → analyticsId
      model.eVar23 = evar23Value;
    }
  }

  // ✅ ADD THIS BLOCK
  if (window.s_wdpro) {
    if (model.eVar13) window.s_wdpro.eVar13 = model.eVar13;
    if (model.eVar14) window.s_wdpro.eVar14 = model.eVar14;
    if (model.eVar23) window.s_wdpro.eVar23 = model.eVar23;

    // ✅ wait for analytics to fire, then clear
    setTimeout(() => {
      sessionStorage.removeItem('cw_form_data');
      sessionStorage.removeItem('cw_analytics_id');
    }, 1000); // 300–800ms is safe
  }
  // Adding custom configurations (replace $.extend)
  Object.assign(model.configuration, DFTWH.data.analytics.configuration);

  // Adding custom properties (replace $.extend)
  Object.assign(model, DFTWH.data.analytics.properties);

  if (window.WDPRO && WDPRO.Analytics && WDPRO.Analytics.Framework) {
    WDPRO.Analytics.Framework.update(model);
  }
})();
