/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this, no-unused-vars */

const handleStoryCards = (main) => {
  // standard cards - with icons or image
  const cardsSections = main.querySelectorAll('ul.tileList');

  [...cardsSections].forEach((cardSection) => {
    const cards = cardSection.querySelectorAll('li');

    if (cards.length > 0) {
      if (!cardSection.closest('.ctas')) {
        const cells = [];

        [...cards].forEach((card) => {
          const panelBody = card.querySelector('.panel-body');

          if (panelBody) {
            const icon = card.querySelector('.headerIcon');
            const img = card.querySelector('img');
            const link = card.querySelector('a');
            let leftCol = '';
            if (icon) {
              leftCol = icon.outerHTML;
            } else if (img) {
              leftCol = img.outerHTML;
            }

            const isClickableCardsBlock = link && link.textContent === link.href;

            if (link && isClickableCardsBlock) {
              panelBody.innerHTML += link.outerHTML;
            }

            panelBody.querySelectorAll('.headerIcon, img').forEach((el) => el.remove());
            cells.push([leftCol, panelBody.innerHTML]);
          }
        });

        const blockTable = WebImporter.Blocks.createBlock(document, {
          name: 'Cards',
          cells,
        });

        cardSection.replaceWith(blockTable);
      } else {
        const columnsBlock = WebImporter.Blocks.createBlock(document, {
          name: 'Columns (center)',
          cells: [[...cards].map((card) => {
            const link = card.querySelector('a');
            return link ? `<strong><em>${link.outerHTML}</em></strong>` : '';
          })],
        });
        cardSection.replaceWith(columnsBlock);
      }
    }
  });

  // storyCards
  const storyCardsSections = main.querySelectorAll('ul.storyCard');

  /**
   * pretty much everything on this site is a story card, check for the wrapper class name
   * to determine if it should map to columns, cards or whatever else
   */

  if (storyCardsSections.length > 0) {
    [...storyCardsSections].forEach((storyCardsSection) => {
      const wrapper = storyCardsSection.closest('.storyCardWrapper');
      const cardBlockClasses = ['square-card', 'normal-card', 'two-column-card'];
      const isCardsBlock = wrapper
        && cardBlockClasses.some((cls) => wrapper.classList.contains(cls));
      const isColumnsBlock = wrapper && (
        wrapper.classList.contains('stamp-cards')
        || wrapper.querySelector('.media.full-width.single')
        || storyCardsSection.querySelector('.event-card.single')
        || storyCardsSection.querySelector('.full-alternate.single')
        || (wrapper.classList.contains('single') && !storyCardsSection.querySelector('.event-card'))
      );
      const isEventDetailBlock = storyCardsSection.querySelector('.event-card');
      const isIconListBlock = wrapper && (wrapper.classList.contains('storyCardBadge'));
      const isCalloutBlock = (storyCardsSection.querySelector('.storyCardIcon') && !wrapper.classList.contains('storyCardBadge')) || storyCardsSection.querySelector('as-story-card-training-item');

      const checklist = storyCardsSection.querySelectorAll('.check-list');

      if (checklist.length > 0) {
        checklist.forEach((checklistEl) => {
          checklistEl.querySelectorAll('.pepicon').forEach((icon) => {
            icon.remove();
          });
        });
      }

      if (isEventDetailBlock) {
        const cards = storyCardsSection.querySelectorAll(':scope > li');
        const eventCards = [];
        const otherCards = [];

        // Separate event cards from other cards
        [...cards].forEach((card) => {
          if (card.querySelector('.event-card')) {
            eventCards.push(card);
          } else {
            otherCards.push(card);
          }
        });

        // Process event cards as Event Detail blocks
        const eventDetailBlocks = [];
        eventCards.forEach((eventCard) => {
          const cells = [];
          let imageCol = '';
          let contentCol = '';

          const media = eventCard.querySelector('.media');
          if (media) {
            const img = media.querySelector('img');
            const mediaBody = media.querySelector('.media-body');
            imageCol = img ? img.outerHTML : '';
            contentCol = mediaBody ? mediaBody.innerHTML : '';
          }

          const link = eventCard.querySelector('a');
          if (link && (!media || !media.contains(link))) {
            contentCol += link.outerHTML;
          }

          if (imageCol || contentCol) {
            cells.push([imageCol, contentCol]);
          }

          const eventDetailBlock = WebImporter.Blocks.createBlock(document, {
            name: 'Event Detail',
            cells,
          });
          eventDetailBlocks.push(eventDetailBlock);

          // Add HR after event detail block
          const hr = document.createElement('hr');
          eventDetailBlocks.push(hr);
        });

        // Process remaining cards as columns if there are any
        let columnsBlock = null;
        if (otherCards.length > 0) {
          const cells = [];
          [...otherCards].forEach((card) => {
            let leftCol = '';
            let rightCol = '';

            const media = card.querySelector('.media');
            if (media) {
              const mediaLeft = media.querySelector('.media-left');
              const mediaRight = media.querySelector('.media-right');
              const mediaBody = media.querySelector('.media-body');

              if (mediaLeft) {
                leftCol = mediaLeft.outerHTML;
                rightCol = mediaBody ? mediaBody.outerHTML : '';
              } else if (mediaRight) {
                leftCol = mediaBody ? mediaBody.outerHTML : '';
                rightCol = mediaRight.outerHTML;
              } else {
                rightCol = mediaBody ? mediaBody.outerHTML : '';
              }
            } else {
              rightCol = card.innerHTML;
            }

            if (leftCol || rightCol) {
              cells.push([leftCol, rightCol]);
            }
          });

          if (cells.length > 0) {
            columnsBlock = WebImporter.Blocks.createBlock(document, {
              name: 'Columns (border)',
              cells,
            });
          }
        }

        const allBlocks = [...eventDetailBlocks];
        if (columnsBlock) {
          allBlocks.push(columnsBlock);
        }

        if (allBlocks.length > 0) {
          storyCardsSection.replaceWith(...allBlocks);
        } else {
          storyCardsSection.remove();
        }
      }

      if (isCardsBlock) {
        const cards = storyCardsSection.querySelectorAll(':scope > li');
        const cells = [];

        [...cards].forEach((card) => {
          let contentCol = '';
          let imageCol = '';

          const media = card.querySelector('.media');
          const link = card.querySelector('a');

          if (media) {
            const img = media.querySelector('img');
            const mediaBody = media.querySelector('.media-body');
            imageCol = img ? img.outerHTML : '';
            contentCol = mediaBody ? mediaBody.innerHTML : '';
          }

          if (link) {
            contentCol += link.outerHTML;
          }

          if (imageCol || contentCol) {
            cells.push([imageCol, contentCol]);
          }
        });

        let blockName = 'Cards';
        const isClickableCardsBlock = storyCardsSection.querySelector('a') && storyCardsSection.querySelector('a').textContent === storyCardsSection.querySelector('a').href;

        if (isClickableCardsBlock) {
          blockName = 'Cards (Clickable)';
        }

        if (cells.length > 0) {
          const blockTable = WebImporter.Blocks.createBlock(document, {
            name: blockName,
            cells,
          });

          storyCardsSection.replaceWith(blockTable);
        }
      } else if (isColumnsBlock) {
        const hasIcon = !storyCardsSection.querySelector('.full-alternate.single') && storyCardsSection.querySelector('.titleRow .pepicon');
        const blockName = hasIcon ? 'Columns (Icon Separator)' : 'Columns (border)';

        // const hasBlueBackground = storyCardsSection.querySelector('.media-body[ng-style*="backgroundColor"]');
        // if (hasBlueBackground) {
        //   blockName = hasIcon ? 'Columns (Icon Separator, Blue)' : 'Columns (Blue)';
        // }

        const cards = storyCardsSection.querySelectorAll(':scope > li');
        const cells = [];

        [...cards].forEach((card) => {
          let leftCol = '';
          let rightCol = '';

          const media = card.querySelector('.media');
          if (media) {
            const mediaLeft = media.querySelector('.media-left');
            const mediaRight = media.querySelector('.media-right');
            const mediaBody = media.querySelector('.media-body');

            if (mediaLeft) {
              leftCol = mediaLeft.outerHTML;
              rightCol = mediaBody ? mediaBody.outerHTML : '';
            } else if (mediaRight) {
              leftCol = mediaBody ? mediaBody.outerHTML : '';
              rightCol = mediaRight.outerHTML;
            } else {
              rightCol = mediaBody ? mediaBody.outerHTML : '';
            }
          } else {
            rightCol = card.innerHTML;
          }

          const fullAlternate = storyCardsSection.querySelector('.full-alternate.single');

          if (fullAlternate) {
            const metadataTable = WebImporter.Blocks.createBlock(document, {
              name: 'Section Metadata',
              cells: [['Style', 'Full Width']],
            });
            storyCardsSection.after(metadataTable);

            const icon = fullAlternate.querySelector('.iconContainer');
            if (icon) {
              const h3 = fullAlternate.querySelector('.title');
              if (h3) {
                const iconHTML = icon.outerHTML.replace(/ng-if="[^"]*"/g, '');

                if (leftCol && leftCol.includes('class="title"')) {
                  leftCol = leftCol.replace(/<div[^>]*class="iconContainer"[^>]*>[\s\S]*?<\/div>/g, '');
                  leftCol = leftCol.replace(
                    /<div[^>]*class="title"[^>]*>([\s\S]*?)<\/div>/,
                    `<div class="title" role="heading" aria-level="3">${iconHTML}&nbsp;$1</div>`,
                  );
                } else if (rightCol && rightCol.includes('class="title"')) {
                  rightCol = rightCol.replace(/<div[^>]*class="iconContainer"[^>]*>[\s\S]*?<\/div>/g, '');
                  rightCol = rightCol.replace(
                    /<div[^>]*class="title"[^>]*>([\s\S]*?)<\/div>/,
                    `<div class="title" role="heading" aria-level="3">${iconHTML}&nbsp;$1</div>`,
                  );
                }
              }
            }
          }

          if (leftCol || rightCol) {
            cells.push([leftCol, rightCol]);
          }
        });

        if (cells.length > 0) {
          storyCardsSection.replaceWith(WebImporter.Blocks.createBlock(document, {
            name: blockName,
            cells,
          }));
        }
      } else if (isCalloutBlock) {
        let blockname = 'Callout';
        const rows = storyCardsSection.querySelectorAll('li');
        const cells = [];
        [...rows].forEach((row) => {
          const rightMedia = row.querySelector('.media-right');

          if (rightMedia) {
            rightMedia.remove();
          }
          cells.push([row.innerHTML]);
        });

        if (storyCardsSection.querySelector('as-story-card-training-item')) {
          blockname = `${blockname} (Download)`;

          cells.length = 0;
          [...rows].forEach((row) => {
            const mediaLeft = row.querySelector('.media-left');
            if (mediaLeft) {
              const typeElement = mediaLeft.querySelector('.type');
              if (typeElement) {
                const h3 = document.createElement('h3');
                h3.innerHTML = typeElement.innerHTML;
                typeElement.replaceWith(h3);
              }
            }
            const mediaBody = row.querySelector('.media-body');
            const mediaRight = row.querySelector('.media-right');
            const downloadLink = mediaRight ? mediaRight.querySelector('a') : null;

            const leftCol = mediaLeft ? mediaLeft.outerHTML : '';
            let rightCol = mediaBody ? mediaBody.outerHTML : '';

            if (downloadLink) {
              rightCol += downloadLink.outerHTML;
            }

            cells.push([leftCol, rightCol]);
          });
        }

        storyCardsSection.replaceWith(WebImporter.Blocks.createBlock(document, {
          name: blockname,
          cells,
        }));
      } else if (isIconListBlock) {
        const rows = storyCardsSection.querySelectorAll(':scope > li');
        const cells = [];
        [...rows].forEach((row) => {
          const mediaLeft = row.querySelector('.media-left');
          const mediaBody = row.querySelector('.media-body');
          const leftCol = mediaLeft ? mediaLeft.outerHTML : '';
          const rightCol = mediaBody ? mediaBody.outerHTML : '';
          if (leftCol.trim() !== '' || rightCol.trim() !== '') {
            cells.push([leftCol, rightCol]);
          }
        });

        storyCardsSection.replaceWith(WebImporter.Blocks.createBlock(document, {
          name: 'Icon List',
          cells,
        }));
      }
    });
  }
};

const handleBlogPosts = (main, metadata) => {
  // if (!main.querySelector('#blogDetail')) {
  //   return;
  // }

  // Handle blog-images-tile double structure - convert to multi-image block
  const blogImagesTiles = main.querySelectorAll('.blog-images-tile.double, .blog-images-tile.quad');
  blogImagesTiles.forEach((blogImagesTile) => {
    const imageContainers = blogImagesTile.querySelectorAll('.imageCont');
    const imageContents = [];

    imageContainers.forEach((container) => {
      const img = container.querySelector('img');
      const link = container.querySelector('a');
      let imageContent = '';

      if (img) {
        // Get the image source
        const imgSrc = img.getAttribute('src') || '';
        // If there's a link, wrap the image in the link
        if (link) {
          const linkHref = link.getAttribute('href') || '#';
          imageContent = `<a href="${linkHref}"><img src="${imgSrc}" alt="${img.getAttribute('alt') || ''}"></a>`;
        } else {
          imageContent = `<img src="${imgSrc}" alt="${img.getAttribute('alt') || ''}">`;
        }
        imageContents.push(imageContent);
      }
    });

    // Group images into rows of 2
    if (imageContents.length > 0) {
      const cells = [];
      for (let i = 0; i < imageContents.length; i += 2) {
        const row = [];
        row.push(imageContents[i]);
        // Add second image if it exists, otherwise add empty string
        if (i + 1 < imageContents.length) {
          row.push(imageContents[i + 1]);
        } else {
          row.push('');
        }
        cells.push(row);
      }

      const multiImageBlock = WebImporter.Blocks.createBlock(document, {
        name: 'columns',
        cells,
      });
      blogImagesTile.replaceWith(multiImageBlock);
    }
  });

  const blogFilter = main.querySelector('.right-sidebar');

  if (blogFilter) {
    const blogFilterBlock = WebImporter.Blocks.createBlock(document, {
      name: 'Blog Filter',
      cells: [],
    });

    const featuredBlogsBlock = WebImporter.Blocks.createBlock(document, {
      name: 'Featured Blogs',
      cells: [],
    });

    blogFilter.before(document.createElement('hr'));
    blogFilter.replaceWith(featuredBlogsBlock);
    const hr = document.createElement('hr');
    featuredBlogsBlock.after(hr);
    hr.after(blogFilterBlock);
  }

  // h1 is always 'Myridius Blog' on every blog post. Remove it and make the h2,
  // which is the actual title of the blog post, the h1.
  const h1 = document.createElement('h1');
  h1.innerHTML = main.querySelector('h1 a').textContent.trim();
  main.querySelector('h1').replaceWith(h1);
  // if (h1) {
  //   h1.remove();
  // }

  const heroImg = main.querySelector('.firstImage');
  if (heroImg) {
    heroImg.after(document.createElement('hr'));
  }

  const video = main.querySelectorAll('as-media-engine');

  if (video.length > 0) {
    video.forEach((vid) => {
      const { src } = vid.querySelector('video');

      const videoBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Video',
        cells: [[`<a href="${src}">${src}</a>`]],
      });
      vid.replaceWith(videoBlock);
      vid.after(document.createElement('hr'));
    });
  }

  const author = main.querySelector('.article-author').textContent.trim();
  const authorName = author.replace('by ', '');
  const date = main.querySelector('.article-date-post').textContent;
  const categories = [...main.querySelectorAll('.article-category')]
    .map((a) => a.textContent.trim().replace(/\s*,\s*$/, ''));

  metadata.Author = `authors/${authorName}`;
  metadata.Date = date;
  metadata.Tags = categories
    .map((cat) => {
      const kebab = cat
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return `categories/${kebab}`;
    })
    .join(', ');
  metadata.Template = 'blog-post';
};

const handleLinks = (main) => {
  const links = main.querySelectorAll('a');

  links.forEach((link) => {
    const originalHref = link.href;
    let newHref = originalHref;

    newHref = newHref.replace(/^https?:\/\/(www\.)?disneymeetingsandevents\.com(.*)/, 'https://main--dme--twdc-minnie.aem.page/$2');

    if (originalHref.startsWith('http://localhost:3001/')) {
      newHref = originalHref.replace('http://localhost:3001/', 'https://main--dme--twdc-minnie.aem.page//');
    } else if (originalHref.startsWith('/')) {
      newHref = `https://main--dme--twdc-minnie.aem.page/${originalHref}`;
    }

    if (newHref.includes('?host=http%3A%2F%2Flocalhost%3A4001')) {
      newHref = newHref.replace('?host=http%3A%2F%2Flocalhost%3A4001', '');
    }

    // handle sampe page links
    if (link.classList.contains('same.page.link')) {
      newHref = newHref.replace(newHref, '#');
    }

    newHref = newHref.replace(/\/$/, '');
    link.href = newHref;

    if (link.textContent.trim() === originalHref) {
      link.textContent = newHref;
    }
  });
};

const handleIcons = (main) => {
  const icons = main.querySelectorAll('[class*="icon__"]');
  icons.forEach((icon) => {
    const iconClass = [...icon.classList].find((cls) => cls.startsWith('icon__'));
    const iconName = iconClass ? iconClass.replace('icon__', '') : '';
    icon.replaceWith(`:${iconName}:`);
  });
};

export const handleSections = (main) => {
  const sections = main.querySelectorAll('.contentGroupItem:not(:has(.cssOverride)):not(:has(.heroImage))');

  sections.forEach((section) => {
    if (section !== sections[sections.length - 1]) {
      // handle sections that have no content at all - there are many of these on many pages.
      if (section.innerHTML.trim() === '') {
        section.remove();
      }

      const firstDiv = section.querySelector('div');
      // Add more below later - many gray background shades and borders are used on the site.
      const grayBackgroundSections = ['featuredEventsContainer'];
      const isGrayBackgroundSection = firstDiv
        && grayBackgroundSections.some((cls) => firstDiv.classList.contains(cls));
      const isIconFramedSection = firstDiv && firstDiv.classList.contains('storyCardBadge');
      const isPrimaryIntro = section.classList.contains('primaryContentIntro');

      if (isGrayBackgroundSection) {
        const metadataTable = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: [['Style', 'Gray Background']],
        });
        section.after(metadataTable);
        metadataTable.after(document.createElement('hr'));
      } else if (isIconFramedSection) {
        const icon = firstDiv.querySelector('.iconBorder');
        const iconName = icon.textContent.trim().replace(/^:|:$/g, '');
        icon.remove();

        const metadataTable = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: [
            ['Style', 'Icon Frame'],
            ['icon', iconName],
          ],
        });
        section.after(metadataTable);
        metadataTable.after(document.createElement('hr'));
      } else if (isPrimaryIntro) {
        const metadataTable = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: [['Style', 'Primary Intro']],
        });
        section.after(metadataTable);
        metadataTable.after(document.createElement('hr'));
      } else {
        section.after(document.createElement('hr'));
      }
    }

    const hiddenStuff = section.querySelectorAll('.hidden, [aria-hidden="true"]');

    hiddenStuff.forEach((hidden) => {
      hidden.remove();
    });
  });
};

const handleHeroes = (main) => {
  const heroImage = main.querySelector('.heroImage');
  const h1 = main.querySelector('h1');
  const heroTitle = main.querySelector('.heroImageTitle');

  if (heroImage && heroTitle && h1) {
    if (heroTitle.tagName !== 'H1') {
      const newH1 = document.createElement('h1');
      newH1.className = heroTitle.className;
      newH1.innerHTML = heroTitle.innerHTML;
      heroTitle.replaceWith(newH1);
      const newH2 = document.createElement('h2');
      newH2.className = h1.className;
      newH2.innerHTML = h1.innerHTML;
      h1.replaceWith(newH2);

      heroImage.after(newH1);
      newH1.after(document.createElement('hr'));
    }
  } else if (heroImage && h1) {
    h1.after(document.createElement('hr'));
  } else if (!h1) {
    const h2 = main.querySelector('h2');
    if (h2) {
      const newH1 = document.createElement('h1');
      newH1.className = h2.className;
      newH1.innerHTML = h2.innerHTML;
      h2.replaceWith(newH1);

      if (!newH1.closest('.blogDetailHeading')) {
        newH1.after(document.createElement('hr'));
      }
    }
  }
};

/** for some pages where headings are styled not as a heading element */
const handleNonHeadingTitles = (main) => {
  const titles = main.querySelectorAll('.title');
  titles.forEach((title) => {
    const h3 = document.createElement('h3');
    h3.innerHTML = title.innerHTML;
    title.replaceWith(h3);
  });
};

const handleButtons = (main) => {
  const buttons = main.querySelectorAll('.btn');
  buttons.forEach((button) => {
    if (button.classList.contains('btn-outline-primary')) {
      const em = document.createElement('em');
      const link = document.createElement('a');
      link.href = button.href;
      link.innerHTML = button.innerHTML;
      em.appendChild(link);
      button.replaceWith(em);
    } else {
      const link = document.createElement('a');
      link.href = button.href;
      link.innerHTML = button.innerHTML;
      const strong = document.createElement('strong');
      strong.appendChild(link);
      button.replaceWith(strong);
    }
  });
};

const handleAccordions = (main) => {
  const accordions = main.querySelectorAll('.panel-group .panel-body .panel-group');

  accordions.forEach((accordion) => {
    const panels = accordion.querySelectorAll('.panel');
    const cells = [];

    panels.forEach((panel) => {
      const heading = panel.querySelector('.panel-heading');
      heading.querySelectorAll('.pepicon').forEach((icon) => icon.remove());
      const body = panel.querySelector('.panel-body');

      if (heading && body) {
        cells.push([heading.innerHTML, body.innerHTML]);
      }
    });

    if (cells.length > 0) {
      const accordionBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Accordion',
        cells,
      });
      accordion.replaceWith(accordionBlock);
    }
  });
};

const handleResults = (main) => {
  const resultsFilter = main.querySelector('.resultsFilter');

  if (resultsFilter) {
    const metadataTable = WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata',
      cells: [['Style', 'PYT Filter']],
    });

    const autolist = main.querySelector('.autolist');
    if (autolist) {
      const listColumnsTable = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: [['Style', 'List Columns']],
      });
      autolist.after(listColumnsTable);
      autolist.after(document.createElement('hr'));
    }

    resultsFilter.before(metadataTable);
    resultsFilter.remove();

    const h1 = main.querySelector('h1');
    const h1Clone = h1.cloneNode(true);
    metadataTable.before(h1Clone);
    h1.remove();

    const subTitle = main.querySelector('.subTitle');
    const hr = subTitle.nextElementSibling;
    if (hr) {
      hr.remove();
    }
  }

  const legal = main.querySelector('.detailedDescriptionHolder');
  if (legal) {
    const metadataTable = WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata',
      cells: [['Style', 'Narrow']],
    });

    const p = legal.querySelector('p');
    const u = document.createElement('u');
    u.innerHTML = p.innerHTML;
    p.replaceWith(u);
    legal.after(metadataTable);
  }
};

const handleEvents = (main, document, metadata) => {
  const firstTab = main.querySelector('.linkHolder.selected > a');
  const match = firstTab.href.match(/\/events\/([^/]+\/[^/]+)/);
  const slug = match ? match[1] : '';

  const eventCard = main.querySelector('.event-card');
  const categoryImage = eventCard?.querySelector('img');

  const categoryIdSpan = eventCard?.querySelector('span.category-id');
  const categoryId = categoryIdSpan?.textContent?.trim() || '';

  if (categoryIdSpan) {
    categoryIdSpan.remove();
  }

  const categoryName = eventCard?.querySelector('.title')?.textContent?.trim() || '';

  const eventDetails = main.querySelector('.event-details');
  let startDate = '';
  let endDate = '';

  if (eventDetails) {
    const dateLi = eventDetails.querySelector('li:has(.icon__calendar-month)');
    if (dateLi) {
      const dateText = dateLi.textContent.trim();

      const throughMatch = dateText.match(/[A-Za-z]+day,?\s+([A-Za-z]+\s+\d+),?\s+through\s+[A-Za-z]+day,?\s+([A-Za-z]+\s+\d+),?\s+(\d{4})/);
      const singleDateMatch = dateText.match(/[A-Za-z]+day,?\s+([A-Za-z]+\s+\d+),?\s+(\d{4})/);

      if (throughMatch) {
        const startPart = throughMatch[1].trim();
        const endPart = throughMatch[2].trim();
        const year = throughMatch[3];

        startDate = `${startPart}, ${year}`;
        endDate = `${endPart}, ${year}`;
      } else if (singleDateMatch) {
        const datePart = singleDateMatch[1].trim();
        const year = singleDateMatch[2];

        startDate = `${datePart}, ${year}`;
      }
    }
  }

  // TODO: Add event-specific metadata fields
  metadata['Category ID'] = categoryId;
  metadata['Category Name'] = categoryName;
  metadata['Start Date'] = startDate;
  if (endDate) {
    metadata['End Date'] = endDate;
  }
  metadata.Price = 'placeholder';
  metadata['Registration Link'] = 'placeholder';
  metadata['Category Image'] = categoryImage;
  metadata.Template = 'event';

  WebImporter.DOMUtils.remove(main, [
    '.heroImage',
    '.eventInfo',
    '.tabNavigationWrapper',
  ]);

  const h1 = main.querySelector('h1');

  if (h1) {
    const p = document.createElement('p');
    const fragmentLink = document.createElement('a');
    fragmentLink.href = `https://main--myridius--da-pilot.aem.page/fragments/events/${slug}/header`;
    fragmentLink.textContent = fragmentLink.href;
    p.appendChild(fragmentLink);
    h1.parentNode.insertBefore(p, h1);
    h1.remove();

    const sectionMetadata = WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata',
      cells: [['Style', 'Full Width']],
    });
    p.after(sectionMetadata);
    sectionMetadata.after(document.createElement('hr'));
  }

  const descriptionHolder = main.querySelector('.descriptionHolder');
  if (descriptionHolder) {
    descriptionHolder.after(document.createElement('hr'));
  }

  const eventBoxes = main.querySelector('.eventListItems ul.storyCard');
  if (eventBoxes) {
    const eventGridBlock = WebImporter.Blocks.createBlock(document, {
      name: 'Event Grid',
      cells: [],
    });
    eventBoxes.replaceWith(eventGridBlock);
    const itemNote = main.querySelector('.eventListItems .itemNote');
    if (itemNote) {
      itemNote.after(document.createElement('hr'));
      itemNote.after(WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: [['Style', 'Gray Background, Center']],
      }));
    }
  }
};

export default {
  /**
   * Apply DOM operations to the provided document and return
   * the root element to be then transformed to Markdown.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @returns {HTMLElement} The root element to be transformed
   */

  transform: ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => {
    const main = document.querySelector('#content');
    // attempt to remove non-content elements
    WebImporter.DOMUtils.remove(main, [
      'iframe',
      'noscript',
    ]);

    const hasPreFooterSubscriptionBanner = main.querySelector('.contactInfo');

    const metadata = WebImporter.Blocks.getMetadata(document);
    delete metadata['og:description'];
    delete metadata['twitter:description'];
    metadata['Footer Contact'] = hasPreFooterSubscriptionBanner ? 'true' : 'false';

    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
    WebImporter.rules.convertIcons(main, document);

    // handleEvents(main, document, metadata);
    handleBlogPosts(main, metadata);
    // handleStoryCards(main);
    handleHeroes(main);
    // handleAccordions(main);

    WebImporter.DOMUtils.remove(main, [
      '#post-id',
      '.article-social-bar',
      '.article-date-post',
      '.right-sidebar',
      '.primary-header-content',
      '.blogDetailStayConnected',
      '.blogDetailByline',
      '#blogDetail .asTileFeaturedList',
      '.article-categories',
      '.article-author',
      '.carouselContainer', // temporary
      '.expanded-drawer.collapse',
      '.contactInfo',
      '.sponsor.contentGroupItem',
      '.pageContentWrapper.cssOverride',
    ]);

    handleIcons(main);
    handleSections(main);
    handleNonHeadingTitles(main);
    handleButtons(main);
    handleLinks(main);
    // handleResults(main);

    const metadataBlock = WebImporter.Blocks.getMetadataBlock(document, metadata);
    main.append(metadataBlock);

    const ret = [];

    const path = ((u) => {
      let p = new URL(u).pathname;
      if (p.endsWith('/')) {
        // Extract the last segment from the path to use as filename
        // Remove the trailing slash and use the last segment as the filename
        const pathSegments = p.slice(0, -1).split('/').filter((segment) => segment.length > 0);
        const lastSegment = pathSegments.length > 0
          ? pathSegments[pathSegments.length - 1]
          : 'index';
        // Use just the last segment as the filename (no folder structure)
        p = `/${lastSegment}`;
      }
      return decodeURIComponent(p)
        .toLowerCase()
        .replace(/\.html$/, '')
        .replace(/[^a-z0-9/]/gm, '-');
    })(url);

    ret.push({
      element: main,
      path,
    });

    return ret;
  },
};
