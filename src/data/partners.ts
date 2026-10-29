import { assetUrl } from '../lib/asset';

export type Partner = { name: string; logo: string };

// The logos are self-hosted copies in public/clients, trimmed and sized by scripts/process-client-logos.mjs. The last
// partner is the widest wordmark: it closes the grid of the home on a row of its own at two columns.
export const partners: Partner[] = [
  { name: 'Contador de Padarias', logo: assetUrl('/clients/contador-de-padarias.webp') },
  { name: 'Contas IC', logo: assetUrl('/clients/contas-ic.webp') },
  { name: 'Proplast', logo: assetUrl('/clients/proplast.webp') },
  { name: 'Micael Santiago', logo: assetUrl('/clients/micael-santiago.webp') },
  { name: 'Loja Karla Álvares', logo: assetUrl('/clients/loja-karla-alvares.webp') },
  { name: 'Mercadinho Irmão Cruz', logo: assetUrl('/clients/mercadinho-irmao-cruz.webp') },
  { name: 'ShipSmart', logo: assetUrl('/clients/shipsmart.webp') },
  { name: 'Henrique França', logo: assetUrl('/clients/henrique-franca.webp') },
  { name: 'Criativa Marketing', logo: assetUrl('/clients/criativa-marketing.webp') },
];
