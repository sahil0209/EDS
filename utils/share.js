import { createElement, createIcon } from './dom.js';

function showMobileShareModal(url, title, description) {
  const modal = createElement('div', { class: 'mobile-share-modal' });

  const modalContent = createElement('div', { class: 'mobile-share-modal-content' }, [
    createElement('div', { class: 'mobile-share-header' }, [
      createElement('h3', {}, 'Share'),
      createElement('button', {
        class: 'mobile-share-close',
        'aria-label': 'Close share modal',
      }, createIcon('close-reversed', 's')),
    ]),
    createElement('div', { class: 'mobile-share-buttons' }, [
      createElement('a', {
        href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(description)}`,
        target: '_blank',
        class: 'mobile-share-button',
        'aria-label': 'Share on Pinterest',
        title: 'Share on Pinterest',
      }, [
        createIcon('pinterest', 'l'),
        createElement('span', {}, 'Pinterest'),
      ]),
      createElement('a', {
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        target: '_blank',
        class: 'mobile-share-button',
        'aria-label': 'Share on Facebook',
        title: 'Share on Facebook',
      }, [
        createIcon('facebook', 'l'),
        createElement('span', {}, 'Facebook'),
      ]),
      createElement('a', {
        href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
        target: '_blank',
        class: 'mobile-share-button',
        'aria-label': 'Share on Twitter',
        title: 'Share on Twitter',
      }, [
        createIcon('twitter', 'l'),
        createElement('span', {}, 'Twitter'),
      ]),
      createElement('a', {
        href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this blog post: ${url}`)}`,
        class: 'mobile-share-button',
        'aria-label': 'Share via Email',
        title: 'Share via Email',
      }, [
        createIcon('email', 'l'),
        createElement('span', {}, 'Email'),
      ]),
    ]),
  ]);

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  const closeButton = modal.querySelector('.mobile-share-close');
  const closeModal = () => {
    modal.classList.remove('visible');
    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = '';
    }, 300);
  };

  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      modal.classList.add('visible');
      closeButton.focus();
    });
  });
}

const createShareButton = (options = {}) => {
  const {
    url = window.location.href,
    title = document.title,
    description = document.querySelector('meta[name="description"]')?.content || '',
    className = 'share-button',
    ariaLabel = 'Share this post',
    tooltipTitle = 'Share this post',
  } = options;

  const shareButton = createElement('a', {
    class: className,
    'aria-label': ariaLabel,
    'aria-expanded': 'false',
    role: 'button',
    tabindex: '0',
    title: tooltipTitle,
  }, [
    createElement('p', {}, 'Share'),
    createIcon('share', 's'),
    createElement('div', { class: ['share-tooltip', 'tooltip'] }, [
      createElement('a', {
        href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(description)}`,
        target: '_blank',
        'aria-label': 'Share on Pinterest',
        title: 'Share on Pinterest',
      }, [
        createIcon('pinterest', 's'),
        createElement('span', {}, 'Pinterest'),
      ]),
      createElement('a', {
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        target: '_blank',
        'aria-label': 'Share on Facebook',
        title: 'Share on Facebook',
      }, [
        createIcon('facebook', 's'),
        createElement('span', {}, 'Facebook'),
      ]),
      createElement('a', {
        href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
        target: '_blank',
        'aria-label': 'Share on Twitter',
        title: 'Share on Twitter',
      }, [
        createIcon('twitter', 's'),
        createElement('span', {}, 'Twitter'),
      ]),
      createElement('a', {
        href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this blog post: ${url}`)}`,
        'aria-label': 'Share via Email',
        title: 'Share via Email',
      }, [
        createIcon('email', 's'),
        createElement('span', {}, 'Email'),
      ]),
    ]),
  ]);

  let hoverTimeout;
  let closeTooltipHandler = null;

  const showTooltip = () => {
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    if (isMobile) return;

    const tooltip = shareButton.querySelector('.share-tooltip');
    tooltip.classList.add('visible');
    shareButton.setAttribute('aria-expanded', 'true');
  };

  const hideTooltip = () => {
    const tooltip = shareButton.querySelector('.share-tooltip');
    tooltip.classList.remove('visible');
    shareButton.setAttribute('aria-expanded', 'false');
    if (closeTooltipHandler) {
      document.removeEventListener('click', closeTooltipHandler);
      closeTooltipHandler = null;
    }
  };

  // Hover functionality for desktop
  shareButton.addEventListener('mouseenter', () => {
    clearTimeout(hoverTimeout);
    showTooltip();
  });

  shareButton.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      hideTooltip();
    }, 100);
  });

  // Click functionality
  shareButton.addEventListener('click', (e) => {
    if (e.target.closest('.share-tooltip a')) {
      return;
    }

    e.preventDefault();

    const isMobile = window.matchMedia('(max-width: 1023px)').matches;

    if (isMobile) {
      showMobileShareModal(url, title, description);
    } else {
      const tooltip = shareButton.querySelector('.share-tooltip');
      const isExpanded = shareButton.getAttribute('aria-expanded') === 'true';

      tooltip.classList.toggle('visible');
      shareButton.setAttribute('aria-expanded', !isExpanded);

      if (!isExpanded) {
        closeTooltipHandler = (event) => {
          if (!shareButton.contains(event.target)) {
            hideTooltip();
          }
        };

        setTimeout(() => {
          document.addEventListener('click', closeTooltipHandler);
        }, 0);
      }
    }
  });

  shareButton.addEventListener('keydown', (e) => {
    // ENTER or SPACE toggles menu
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      shareButton.click(); // use existing logic
      // After opening menu, focus first link inside tooltip
      const tooltip = shareButton.querySelector('.share-tooltip');
      if (tooltip && tooltip.classList.contains('visible')) {
        const firstLink = tooltip.querySelector('a');
        if (firstLink) {
          firstLink.focus();
        }
      }
    } else if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      hideTooltip();
      shareButton.focus();
    }
  });

  // Accessibility fix: make Enter trigger links inside tooltip
  const tooltipLinks = shareButton.querySelectorAll('.share-tooltip a');
  tooltipLinks.forEach((link) => {
    link.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        link.click();
      }
    });
  });

  // TAB-OUT functionality (keyboard users)
  const tooltip = shareButton.querySelector('.share-tooltip');

  tooltip.addEventListener('focusout', () => {
    setTimeout(() => {
      const active = document.activeElement;
      if (!tooltip.contains(active) && active !== shareButton) {
        hideTooltip();
      }
    }, 0);
  });

  return shareButton;
};

export default createShareButton;
