const taxonomyEndpoint = '/taxonomy.json';
let taxonomyPromise = null;

function fetchTaxonomy() {
  if (!taxonomyPromise) {
    taxonomyPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const response = await fetch(taxonomyEndpoint);
          if (!response.ok) {
            throw new Error(`Taxonomy API returned ${response.status}`);
          }
          const data = await response.json();
          const taxonomy = {};
          const lowercaseMap = {};

          data.data.forEach((row) => {
            taxonomy[row.tag] = {
              tag: row.tag,
              title: row.en,
              path: row.path || `/${row.tag}`,
              img: row.img,
              name: row.name,
              unique_name: row.unique_name,
              map_description: row.map_description,
              map_data: row.map_data,
            };
            lowercaseMap[row.tag.toLowerCase()] = row.tag;
          });

          resolve({ taxonomy, lowercaseMap });
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return taxonomyPromise;
}

export function getTag(tagFullName) {
  return fetchTaxonomy().then(({ taxonomy, lowercaseMap }) => {
    if (taxonomy[tagFullName]) {
      return taxonomy[tagFullName];
    }
    const normalizedKey = lowercaseMap[tagFullName.toLowerCase()];
    return normalizedKey ? taxonomy[normalizedKey] : null;
  });
}

export function getTaxonomy() {
  return fetchTaxonomy().then(({ taxonomy }) => taxonomy);
}

export function getTagsByCategory(category) {
  return fetchTaxonomy().then(({ taxonomy }) => Object.values(taxonomy).filter((tag) => tag.tag.startsWith(`${category}/`)));
}

export function getSponsors() {
  return getTagsByCategory('sponsors');
}

export function getLocations() {
  return getTagsByCategory('location');
}
