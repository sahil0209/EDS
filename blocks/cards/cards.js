import { createOptimizedPicture } from '../../scripts/aem.js';
import { hideDecorativeIconsInBlock, decorateLinks } from '../../scripts/scripts.js';

function applyCardColor(block) {
  if (!block) return;
  const items = block.querySelectorAll('ul > li');
  if (!items.length) return;

  items.forEach((li) => {
    const paragraphs = li.querySelectorAll(
      '.cards-card-body:first-child p',
    );

    if (!paragraphs.length) return;
    const bgColor = paragraphs[0].textContent.trim();
    const textColor = paragraphs[1]?.textContent.trim();
    if (block.closest('.promo-grid')) {
      const bgParagraph = [...li.querySelectorAll('p')].find((p) => /\[background-color\s*=\s*.*?\]/.test(p.textContent));
      const textColorParagraph = [...li.querySelectorAll('p')].find((p) => /\[font-color\s*=\s*.*?\]/.test(p.textContent));
      if (bgParagraph) {
        const colorMatch = bgParagraph.textContent.match(/\[background-color\s*=\s*(.*?)\]/);

        if (colorMatch?.[1]) {
          li.classList.add(colorMatch[1].trim());
          li.querySelectorAll('.cards-card-body').forEach((body) => {
            const arrow = body.querySelector('.arrow-span');
            arrow.style.borderBottomColor = `var(--${colorMatch[1].trim()})`;
          });
        }
        bgParagraph.remove();
      }

      if (textColorParagraph) {
        const colorMatch = textColorParagraph.textContent.match(/\[font-color\s*=\s*(.*?)\]/);
        if (colorMatch?.[1]) {
          li.querySelectorAll('.cards-card-body:nth-child(2)').forEach((body) => {
            body.classList.add(colorMatch[1].trim());
          });
        }
        textColorParagraph.remove();
      }
    }

    li.style.backgroundColor = bgColor;
    if (textColor) {
      li.querySelectorAll('.cards-card-body').forEach((body) => {
        body.style.color = textColor;
        if (block.closest('.promo-grid')) {
          const arrow = body.querySelector('.arrow-span');
          arrow.style.borderBottomColor = bgColor;
        }
      });
    }
    paragraphs[0].remove();
    if (paragraphs[1]) paragraphs[1].remove();
  });
}

function applyWallpaperBg(block) {
  if (!block.classList.contains('digital-wallpaper-downloads')) return;

  block.querySelectorAll('.cards-card-body').forEach((body) => {
    const bgParagraph = [...body.querySelectorAll('p')]
      .find((p) => /\[background-color\s*=\s*.*?\]/.test(p.textContent));

    if (!bgParagraph) return;

    const match = bgParagraph.textContent.match(/\[background-color\s*=\s*(.*?)\]/);

    if (match?.[1]) {
      const bgClass = match[1].trim();

      // Apply class (preferred)
      const card = body.closest('a.card-clickable');
      if (card) {
        card.classList.add(bgClass);
      }

      // OR if you want inline:
      // body.style.backgroundColor = `var(--${bgClass})`;
    }

    bgParagraph.remove();
  });
}

function applySectionBg(section) {
  if (!section || section.dataset.bgApplied) return;
  const bgClass = section.dataset.background;
  const wrapper = section.querySelector('.cards-wrapper');
  if (wrapper) {
    // ✅ KEY LINE (this was missing)
    wrapper.style.setProperty('--card-bg', `${bgClass}`);
  }

  section.dataset.bgApplied = true;
}

function moveDefaultContentInsideWrapper(section) {
  if (!section) return;

  const defaultContent = section.querySelector('.default-content-wrapper');
  const cardsWrapper = section.querySelector('.cards-wrapper');

  // prevent duplicate move
  if (!defaultContent || !cardsWrapper || cardsWrapper.contains(defaultContent)) return;

  // move as FIRST CHILD
  cardsWrapper.prepend(defaultContent);
}

function applyMobileCardBg(block) {
  const section = block.closest('.rectangle-image-container');
  if (!section) return;
  const bgImage = section.dataset.backgroundImage;

  if (window.matchMedia('(min-width: 1024px)').matches) {
    if (!bgImage) return;
    let bgdiv = section.querySelector('.bg-image-div');
    if (!bgdiv) {
      bgdiv = document.createElement('div');
      bgdiv.classList.add('bg-image-div');
      section.appendChild(bgdiv);
    }
    bgdiv.style.backgroundImage = `url(${bgImage})`;
    section.style.backgroundImage = 'none';
    delete section.dataset.backgroundImage;
  } else {
    block.querySelectorAll('ul > li').forEach((li) => {
      const imageWrap = li.querySelector('.cards-card-image');
      if (!imageWrap || imageWrap.querySelector('.cards-mobile-bg')) return;

      const bgmbilediv = document.createElement('div');
      bgmbilediv.classList.add('cards-mobile-bg');
      imageWrap.append(bgmbilediv);
      bgmbilediv.style.backgroundImage = `url(${bgImage})`;
      section.style.backgroundImage = 'none';
      delete section.dataset.backgroundImage;
    });
  }
}

function applyAnchorVarient(block) {
  const cards = block.querySelectorAll('li');
  cards.forEach((li) => {
    li.classList.add('card-clickable');
    const innerAnchor = li.querySelector('.cards-card-body a');
    if (!innerAnchor) return;
    const href = innerAnchor.getAttribute('href');
    if (!href) return;
    const wrapperAnchor = document.createElement('a');
    wrapperAnchor.href = href;
    wrapperAnchor.className = li.className;
    const internalTitle = li.querySelector('h1, h2, h3, h4, h5, h6, .title, strong, [class*="title"]');
    if (internalTitle) {
      innerAnchor.setAttribute('title', `${innerAnchor.textContent} about the ${internalTitle.textContent.trim()}`);
    }
    while (li.firstChild) {
      wrapperAnchor.appendChild(li.firstChild);
    }
    li.replaceWith(wrapperAnchor);
  });
}

function applySquareHoverRectangleLayout(block) {
  if (block.querySelector('a')) {
    block.classList.add('clickable');
  }

  block.classList.remove('square-hover');
  block.closest('.section').classList.add('rectangle-image-container');
  block.classList.add('rectangle-hover', 'rectangle-image');
  block.classList.add('square-hover-rectangle');

  const section = block.closest('.section.rectangle-image-container');
  const ulEl = block.querySelector('ul');
  const items = ulEl?.querySelectorAll(':scope > li') || [];
  const isTwoCards = items.length === 2;
  if (section) {
    applyMobileCardBg(block);
    const bgDiv = section.querySelector('.bg-image-div');
    if (bgDiv) {
      bgDiv.classList.add('square-hover-rectangle-bg');
      bgDiv.style.height = '175px';
      bgDiv.style.top = '48%';
    }
  }

  block.querySelectorAll(':scope > ul > li').forEach((li) => {
    const link = li.querySelector('a');

    if (link && !li.querySelector(':scope > a')) {
      const wrapper = document.createElement('a');
      wrapper.href = link.getAttribute('href');
      wrapper.className = 'card-link-wrapper';

      while (li.firstChild) {
        wrapper.appendChild(li.firstChild);
      }

      li.appendChild(wrapper);
    }
  });

  block.querySelectorAll('p > a').forEach((el) => {
    el.style.display = 'none';
  });

  block.querySelectorAll(':scope > ul > li').forEach((li) => {
    const imageWrap = li.querySelector('.cards-card-image');
    const bg = li.querySelector('.cards-mobile-bg');

    if (imageWrap && bg && !imageWrap.contains(bg)) {
      imageWrap.appendChild(bg);
    }
  });

  block.querySelectorAll('.cards-card-image img').forEach((img) => {
    img.style.aspectRatio = '1 / 1';
    img.style.objectFit = 'cover';
    img.style.setProperty('max-height', 'none', 'important');
  });

  const applyResponsiveStyles = () => {
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    const isTablet = window.matchMedia('(max-width: 768px)').matches;

    block.querySelectorAll('.cards-card-image img').forEach((img) => {
      img.style.setProperty('min-height', isMobile ? 'unset' : '315px');
      img.style.setProperty('width', isTablet ? '80%' : 'unset');
    });

    items.forEach((li) => {
      li.style.position = 'relative';

      const imgWrap = li.querySelector('.cards-card-image');
      if (imgWrap) {
        imgWrap.style.position = 'relative';
        imgWrap.style.zIndex = '1';
      }
    });

    if (isMobile) {
      block.querySelectorAll('.cards-mobile-bg').forEach((el) => {
        el.style.setProperty('display', 'block', 'important');
      });

      if (isTwoCards) {
        if (ulEl) {
          ulEl.style.gridTemplateColumns = '1fr';
          ulEl.style.padding = '0';
        }

        items.forEach((li) => {
          li.style.width = '100%';
          li.style.padding = '0';

          const cardimage = li.querySelector('.cards-card-image');
          const cardbody = li.querySelector('.cards-card-body');

          if (cardimage) {
            cardimage.style.padding = '0';
          }
          if (cardbody) {
            cardbody.style.padding = '0';
          }

          const img = li.querySelector('img');
          if (img) {
            img.style.setProperty('width', '100%', 'important');
            img.style.setProperty('height', 'auto', 'important');
            img.style.aspectRatio = 'unset';
          }

          li.querySelectorAll('.cards-mobile-bg').forEach((bg) => {
            bg.style.setProperty('display', 'none', 'important');
          });
        });
      }
    }

    if (!isMobile) {
      if (ulEl) {
        ulEl.style.gridTemplateColumns = '';
        ulEl.style.padding = '';
      }

      items.forEach((li) => {
        li.style.width = '';
        li.style.padding = '';

        const img = li.querySelector('img');
        if (img) {
          img.style.width = '';
          img.style.height = '';
          img.style.aspectRatio = '1 / 1';
        }

        li.querySelectorAll('.cards-mobile-bg').forEach((bg) => {
          bg.style.display = '';
        });
      });

      if (isTwoCards && ulEl) {
        ulEl.closest('.cards-wrapper').classList.add('square-hover-rectangle-cards-wrapper');
        ulEl.classList.add('square-hover-rectangle-ul-two-cards');
        ulEl.style.setProperty('display', 'grid', 'important');
        ulEl.style.setProperty(
          'grid-template-columns',
          'repeat(2, minmax(0, 538px))',
        );
        ulEl.style.setProperty('justify-content', 'center', 'important');
        ulEl.style.setProperty('gap', '32px');
        ulEl.style.setProperty('position', 'relative');
        ulEl.style.setProperty('top', '-20px');

        items.forEach((li) => {
          const img = li.querySelector('img');
          if (img) {
            img.style.setProperty('aspect-ratio', 'auto', 'important');
            img.style.objectFit = 'cover';
          }
        });
      }
    }
  };

  applyResponsiveStyles();
  window.addEventListener('resize', applyResponsiveStyles);
}

function sanitizeImageDownloadUrl(href) {
  try {
    const u = new URL(href, window.location.href);
    u.pathname = u.pathname.replace(/(\.(?:jpe?g|png|webp)).*$/i, '$1');
    u.search = '';
    u.hash = '';
    return u.href;
  } catch {
    return href
      .split('?')[0]
      .split('#')[0]
      .replace(/(\.(?:jpe?g|png|webp)).*$/i, '$1');
  }
}

function imageDownloadFileName(sanitizedHref) {
  try {
    const { pathname } = new URL(sanitizedHref);
    const base = pathname.split('/').pop() || 'download';
    const withoutJunk = base.replace(/(\.(?:jpe?g|png|webp)).*/i, '$1');
    return decodeURIComponent(withoutJunk);
  } catch {
    return 'download';
  }
}

function enableDownloadOnly(block) {
  block.querySelectorAll('.cards-card-body a').forEach((link) => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const url = sanitizeImageDownloadUrl(link.href);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const fileName = imageDownloadFileName(url);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(blobUrl);
    }, true); // ✅ IMPORTANT: capture phase
  });

  block.querySelectorAll('.cards.digital-wallpaper-downloads .card-clickable').forEach((card) => {
    // Remove outer card from keyboard focus
    card.setAttribute('tabindex', '-1');

    // Hide outer card from screen readers
    card.setAttribute('aria-hidden', 'true');

    const title = card.querySelector('.cards-card-body strong')?.textContent?.trim();

    const downloadLink = card.querySelector('.primary-link');

    if (downloadLink) {
      // Keep inner link accessible
      downloadLink.removeAttribute('aria-hidden');
      downloadLink.setAttribute('tabindex', '0');

      // Add unique accessible label
      if (title) {
        downloadLink.setAttribute(
          'aria-label',
          `Download ${title} wallpaper`,
        );
      }

      // Support Space key activation
      downloadLink.addEventListener('keydown', (event) => {
        if (event.code === 'Space' || event.key === ' ') {
          event.preventDefault();
          downloadLink.click();
        }
      });
    }
  });
}

export default function decorate(block) {
  const thickBorderCard = block.closest('.thick-border');
  if (thickBorderCard) {
    thickBorderCard.classList.add('clickable');
  }

  if (block.classList.contains('rectangle-hover')) {
    const rectangleHover = block.closest('.section');
    if (rectangleHover) {
      rectangleHover.classList.add('center', 'rectangle-image-container');
    }

    if (block.querySelector('a')) {
      block.classList.add('clickable');
    }
    block.classList.add('rectangle-image');
  }
  if (block.classList.contains('card-group')) {
    if (block.querySelector('a')) {
      block.classList.add('clickable');
    }
  }

  const isSquareHoverCards = block.classList.contains('square-hover');

  const ul = document.createElement('ul');
  const childrenLength = block.children.length;
  block.classList.add(`size-${childrenLength}`);

  if (block.classList.contains('overlay')) {
    if (block.querySelector('a')) {
      block.classList.add('clickable');
    }
  }

  const isClickable = block.classList.contains('clickable');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });

    if (block.closest('.promo-grid')) {
      const cardBody = li.querySelectorAll('.cards-card-body');
      cardBody.forEach((body) => {
        const span = document.createElement('span');
        span.className = 'arrow-span';
        body.appendChild(span);
        body.querySelector('a')?.setAttribute('aria-label', body.querySelector('h2, h3, h4, h5, h6')?.textContent ? `${body.querySelector('a').textContent} about ${body.querySelector('h2, h3, h4, h5, h6')?.textContent}` : body.querySelector('a').textContent);
      });
    }

    const anchor = li.querySelector('a');

    if (isClickable && anchor) {
      const anchorClone = anchor.cloneNode(true);
      anchor.closest('p').remove();
      const children = [...li.children];
      anchorClone.innerHTML = '';
      children.forEach((child) => anchorClone.appendChild(child));
      li.innerHTML = '';
      li.appendChild(anchorClone);
      decorateLinks(li);
    }
    if (block.classList.contains('card-group')) {
      li.querySelectorAll('.cards-card-body').forEach((body) => {
        const desc = body.querySelector(':nth-child(2)');
        const iconP = body.querySelector(':nth-child(3)');
        if (!desc || !iconP) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'card-desc-arrow';
        wrapper.append(desc, iconP);
        body.appendChild(wrapper);
      });
    }

    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.textContent = '';
  block.append(ul);
  if (block.classList.contains('acc-aria-hidden')) {
    hideDecorativeIconsInBlock(block);
  }

  if (block.closest('.content-teaser')) {
    applyCardColor(block);
  }

  if (block.closest('.promo-grid')) {
    applyCardColor(block);
    const promogrid = block.closest('.section');
    if (promogrid) {
      promogrid.classList.add('section-promo-grid');
    }
    const promoGridSection = block.closest('.section-promo-grid ');
    const strokeImage = promoGridSection?.dataset.accentStrokeLink;
    if (strokeImage) {
      const escapedStrokeImage = strokeImage.replace(/"/g, '\\"');
      block.style.setProperty('--cards-promo-grid-stroke-image', `url("${escapedStrokeImage}")`);
      block.classList.add('promo-grid--stroke-marker');
    }
  }
  if (isSquareHoverCards) {
    applySquareHoverRectangleLayout(block);
  }
  if (block.closest('.rectangle-image-container')) {
    applyMobileCardBg(block);
    const promoGridSection = block.closest('.rectangle-image-container');
    const strokeImage = promoGridSection?.dataset.accentStrokeHeading;
    if (strokeImage) {
      const escapedStrokeImage = strokeImage.replace(/"/g, '\\"');
      block.style.setProperty('--cards-promo-grid-stroke-image', `url("${escapedStrokeImage}")`);
      block.classList.add('promo-grid--stroke-marker');
    }
  }
  if (block.closest('.grid-variant')) {
    applyAnchorVarient(block);
  }

  if (block.closest('.grid-three-column-variant')
    || block.closest('.digital-wallpaper-downloads')
  ) {
    applyAnchorVarient(block);
    applyCardColor(block);
  }

  if (block.classList.contains('multi-layout-promo')) {
    const section = block.closest('.section');
    const headImage = section?.dataset.accentStrokeHeading;
    block.closest('.cards-wrapper').classList.add('multi-layout-promo-wrapper');
    if (headImage) {
      const escaped = headImage.replace(/"/g, '\\"');
      block.style.setProperty('--cards-multi-layout-promo-head-marker', `url("${escaped}")`);
      block.classList.add('multi-layout-promo--head-marker');
    }
    block.querySelectorAll('ul > li .cards-card-body p > a').forEach((anchor) => {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    });
  }

  if (block.classList.contains('digital-wallpaper-downloads')) {
    applyWallpaperBg(block);
    const section = block.closest('.section');
    if (section && !section.dataset.bgApplied) {
      applySectionBg(section);
      moveDefaultContentInsideWrapper(section); // ✅ ADD THIS
      section.dataset.bgApplied = 'true';
    }
    enableDownloadOnly(block); // 👈 ADD THIS LINE
  }
}
