export interface Project {
  id: number;
  title: string;
  category: string;
  description: string;
  image: string;
  link: string;
  tags: string[];
  gallery?: string[];
}

export const projects: Project[] = [
  {
    id: 1,
    title: "Trocô",
    category: "Gestão Financeira + IA",
    description: "Gestão Inteligente via WhatsApp, N8N e Supabase. Processamento automático de áudios e notas fiscais.",
    image: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Ftroco%2FLogin-Troco.png&version_id=null",
    link: "https://troco-liart.vercel.app/#/",
    tags: ["N8N", "Supabase", "API's Financeiras", "Evolution API"],
    gallery: [
      "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Ftroco%2FDashboard-Troco.png&version_id=null",
      "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Ftroco%2FLembretes-Troco.png&version_id=null",
      "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Ftroco%2FInvestimentos-Troco.png&version_id=null"
    ]
  },
  {
    id: 2,
    title: 'Travel IA',
    category: 'Roteiro Inteligente',
    description: 'Roteirização baseada em IA para guias personalizados. Planejamento completo de viagens com automação de ponta.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FRoteiro%20Inteligente%2FTela_Site.png&version_id=null',
    tags: ['N8N', 'APIs', 'SMTP', 'OpenAI'],
    link: 'https://vupt.site/travel-ia',
    gallery: [
      'https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FRoteiro%20Inteligente%2FTela_Email.png&version_id=null'
    ]
  },
  {
    id: 3,
    title: 'AI Playlist Maker',
    category: 'Curadoria Musical',
    description: 'Curadoria musical inteligente via API do Spotify. Crie playlists personalizadas baseadas em seu gosto e humor usando IA.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FSpotify%2FTela_principal.png&version_id=null',
    tags: ['Spotify API', 'N8N', 'SMTP', 'Inteligência Artificial'],
    link: 'https://vupt.site/spotify-ia',
    gallery: [
      'https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FSpotify%2FTela_email.png&version_id=null'
    ]
  },
  {
    id: 4,
    title: 'Portal Link-in-Bio',
    category: 'Marketing e Conversão',
    description: 'Hub de links personalizado com alta conversão. Centralize sua presença digital com um design otimizado e automação.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FLink%20na%20bio%2Fvn.png&version_id=null',
    tags: ['N8N', 'Webhook', 'HTML', 'CSS'],
    link: 'https://vupt.site/vn',
    gallery: [
      'https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FLink%20na%20bio%2Fmercadinho.png&version_id=null',
      'https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FLink%20na%20bio%2Fkarla.png&version_id=null'
    ]
  }
];
