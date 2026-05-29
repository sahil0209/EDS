import { fetchPublicConfig } from '../scripts/aem.js';

export default async function embedSweepstakes(main) {
  const promoEmbed = document.createElement('div');
  promoEmbed.id = 'promoEmbed';
  if (main) {
    main.appendChild(promoEmbed);
  }
  const tag = document.createElement('script');
  const publicConfig = await fetchPublicConfig();
  tag.src = publicConfig.sweepstakesURL;
  document.body.appendChild(tag);
}
