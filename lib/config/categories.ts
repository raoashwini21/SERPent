export interface BlogCategory {
  name: string;
  slug: string;
  seedKeywords: string[];
}

export const CATEGORIES: BlogCategory[] = [
  {
    name: 'AI SDR',
    slug: 'ai-sdr',
    seedKeywords: [
      'AI SDR',
      'AI sales development representative',
      'automated SDR',
      'AI prospecting',
      'AI outreach',
    ],
  },
  {
    name: 'LinkedIn Automation',
    slug: 'linkedin-automation',
    seedKeywords: [
      'LinkedIn automation',
      'LinkedIn outreach automation',
      'LinkedIn lead generation',
      'LinkedIn connection automation',
      'automated LinkedIn messages',
    ],
  },
  {
    name: 'Sales Tools',
    slug: 'sales-tools',
    seedKeywords: [
      'sales tools',
      'sales software',
      'sales automation tools',
      'best sales tools',
      'sales productivity tools',
    ],
  },
  {
    name: 'Email Outreach',
    slug: 'email-outreach',
    seedKeywords: [
      'email outreach',
      'cold email',
      'email outreach automation',
      'cold email software',
      'email prospecting',
    ],
  },
  {
    name: 'CRM',
    slug: 'crm',
    seedKeywords: [
      'CRM software',
      'CRM tools',
      'best CRM',
      'sales CRM',
      'CRM for small business',
    ],
  },
  {
    name: 'Lead Generation',
    slug: 'lead-generation',
    seedKeywords: [
      'lead generation',
      'B2B lead generation',
      'lead generation tools',
      'lead generation software',
      'automated lead generation',
    ],
  },
];

export const CATEGORY_MAP: Record<string, BlogCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c])
);
