/**
 * Thèmes du site. La clé est le slug utilisé dans le frontmatter (`themes: [ethique]`)
 * et dans l'URL (`/themes/ethique`).
 */
export const THEMES = {
  conscience: {
    label: 'Conscience',
    description: "Une machine peut-elle sentir, comprendre, être quelqu'un ? Et que voulons-nous dire quand nous disons « comprendre » ?",
  },
  langage: {
    label: 'Langage',
    description: 'Parler sans rien vouloir dire, écrire sans auteur : ce que les machines à mots révèlent de nos mots.',
  },
  ethique: {
    label: 'Éthique',
    description: 'Mentir, promettre, être responsable : les vieilles questions morales face à de nouveaux agents.',
  },
  travail: {
    label: 'Travail',
    description: "Ce que l'automatisation fait au travail, et ce que le travail faisait de nous.",
  },
  creativite: {
    label: 'Créativité',
    description: "Création, style, auteur : à qui appartient ce qui a été écrit à deux, dont l'un n'est personne ?",
  },
  relations: {
    label: 'Relations',
    description: 'Parler à une machine, s\u2019attacher à elle, être poli avec elle : ce que cela change entre nous.',
  },
  pouvoir: {
    label: 'Pouvoir',
    description: 'Qui décide, qui contrôle, qui possède : la politique des systèmes qui décident à notre place.',
  },
  attention: {
    label: 'Attention',
    description: "Lire, résumer, se souvenir : ce que devient l'effort de penser quand tout peut être abrégé.",
  },
} as const;

export type ThemeSlug = keyof typeof THEMES;
export const THEME_SLUGS = Object.keys(THEMES) as [ThemeSlug, ...ThemeSlug[]];
