// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

(async function init() {
  const { actions } = await DA_SDK;
  const searchInput = document.getElementById('tag-search');
  const tagsCategories = document.getElementById('tags-categories');
  const selectedTagsList = document.getElementById('selected-tags-list');
  const applyButton = document.getElementById('apply-tags-btn');
  const clearButton = document.getElementById('clear-tags-btn');
  const loadingIndicator = document.getElementById('loading-indicator');

  let taxonomy = [];
  let selectedTags = [];

  function hideLoadingIndicator() {
    loadingIndicator.classList.add('hidden');
  }

  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'toast toast-error';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'toast toast-success';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  function getCategoryFromTag(tag) {
    const parts = tag.split('/');
    return parts[0] || 'other';
  }

  function organizeTagsByCategory(tags) {
    const categories = {};

    tags.forEach((item) => {
      const category = getCategoryFromTag(item.tag);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    });

    return categories;
  }

  function createCategoryTagItem(item) {
    const tagElement = document.createElement('div');
    tagElement.className = 'category-tag-item';
    tagElement.innerHTML = `
      <div class="category-tag-info">
        <div class="category-tag-name">${item.en}</div>
        <div class="category-tag-key">${item.tag}</div>
      </div>
    `;

    tagElement.addEventListener('click', () => {
      // eslint-disable-next-line no-use-before-define
      selectTag(item.tag, item.en);
    });

    return tagElement;
  }

  function selectTag(tagKey, displayName) {
    const tagData = { key: tagKey, name: displayName };
    const existingTag = selectedTags.find((tag) => tag.key === tagKey);

    if (!existingTag) {
      selectedTags.push(tagData);
      // eslint-disable-next-line no-use-before-define
      updateSelectedTagsDisplay();
      // eslint-disable-next-line no-use-before-define
      updateTagItemHighlighting();
    }
  }

  function removeTag(tagKey) {
    selectedTags = selectedTags.filter((tag) => tag.key !== tagKey);
    // eslint-disable-next-line no-use-before-define
    updateSelectedTagsDisplay();
    // eslint-disable-next-line no-use-before-define
    updateTagItemHighlighting();
  }

  function updateTagItemHighlighting() {
    document.querySelectorAll('.category-tag-item').forEach((item) => {
      item.classList.remove('selected');
    });

    selectedTags.forEach((tag) => {
      const tagItems = document.querySelectorAll('.category-tag-item');
      tagItems.forEach((item) => {
        const tagKey = item.querySelector('.category-tag-key').textContent;
        if (tagKey === tag.key) {
          item.classList.add('selected');
        }
      });
    });
  }

  function updateSelectedTagsDisplay() {
    if (selectedTags.length === 0) {
      selectedTagsList.innerHTML = '<p class="no-tags">No tags selected</p>';
      return;
    }

    selectedTagsList.innerHTML = '';
    selectedTags.forEach((tagData) => {
      const tagElement = document.createElement('div');
      tagElement.className = 'selected-tag';
      tagElement.innerHTML = `
        <span class="tag-key">${tagData.key}</span>
        <button class="remove-tag-btn">&times;</button>
      `;

      const removeButton = tagElement.querySelector('.remove-tag-btn');
      removeButton.addEventListener('click', () => {
        removeTag(tagData.key);
      });

      selectedTagsList.appendChild(tagElement);
    });
  }

  function clearAllTags() {
    selectedTags = [];
    updateSelectedTagsDisplay();
    updateTagItemHighlighting();
  }

  function applySelectedTags() {
    if (selectedTags.length === 0) {
      showError('Please select at least one tag.');
      return;
    }

    const tagKeys = selectedTags.map((tag) => tag.key);
    const tagsText = tagKeys.join(', ');

    try {
      actions.sendText(tagsText);
      actions.closeLibrary();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error applying tags:', error);

      navigator.clipboard.writeText(tagsText).then(() => {
        showSuccess(`Copied ${selectedTags.length} tag(s) to clipboard: ${tagsText}`);
      }).catch(() => {
        showError('Failed to copy tags. Please select tags manually.');
      });
    }
  }

  let masonry;

  function initMasonry() {
    if (masonry) {
      masonry.destroy();
    }
    // eslint-disable-next-line no-undef
    masonry = new Masonry(tagsCategories, {
      itemSelector: '.category-column',
      columnWidth: 100,
      gutter: 15,
    });
  }

  function displayTagsByCategory(tags, filter = '') {
    const filteredTags = tags.filter((item) => {
      const nameMatch = item.en.toLowerCase().includes(filter.toLowerCase());
      const keyMatch = item.tag.toLowerCase().includes(filter.toLowerCase());
      return nameMatch || keyMatch;
    });

    const categories = organizeTagsByCategory(filteredTags);

    tagsCategories.innerHTML = '';

    if (filteredTags.length === 0) {
      tagsCategories.innerHTML = '<div class="no-results">No tags found matching your search.</div>';
      return;
    }

    Object.keys(categories).forEach((categoryName) => {
      const categoryColumn = document.createElement('div');
      categoryColumn.className = 'category-column';

      const header = document.createElement('h3');
      header.className = 'category-header';
      header.textContent = categoryName;

      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'category-tags';

      categories[categoryName].forEach((item) => {
        tagsContainer.appendChild(createCategoryTagItem(item));
      });

      categoryColumn.appendChild(header);
      categoryColumn.appendChild(tagsContainer);
      tagsCategories.appendChild(categoryColumn);
    });

    setTimeout(() => {
      initMasonry();
    }, 100);
  }

  async function loadTaxonomy() {
    try {
      const response = await fetch('/taxonomy.json');
      if (!response.ok) {
        throw new Error(`Taxonomy API returned ${response.status}`);
      }
      const data = await response.json();

      const transformedData = data.data.map((row) => ({
        tag: row.tag,
        en: row.en,
        img: row.img,
        path: row.path || `/${row.tag}`,
      }));

      return transformedData;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load taxonomy:', error);
      showError('Failed to load taxonomy data. Please refresh the page.');
      throw error;
    }
  }

  try {
    taxonomy = await loadTaxonomy();
    hideLoadingIndicator();
    displayTagsByCategory(taxonomy);

    searchInput.addEventListener('input', (event) => {
      displayTagsByCategory(taxonomy, event.target.value);
    });

    setTimeout(() => {
      initMasonry();
    }, 100);

    window.addEventListener('resize', () => {
      if (masonry) {
        masonry.layout();
      }
    });

    applyButton.addEventListener('click', applySelectedTags);
    clearButton.addEventListener('click', clearAllTags);

    searchInput.focus();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error:', error);
    hideLoadingIndicator();
    tagsCategories.innerHTML = `
      <div class="error-state">
        <div class="error-icon">❌</div>
        <div class="error-message">${error.message}</div>
        <button class="retry-button" onclick="location.reload()">Retry</button>
      </div>
    `;
    searchInput.disabled = true;
  }
}());
