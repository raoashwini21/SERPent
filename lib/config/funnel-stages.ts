export type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';

export type BlogSection =
  | 'tldr'
  | 'intro'
  | 'body_sections'
  | 'comparison_table'
  | 'alternatives'
  | 'pros_cons'
  | 'features'
  | 'pricing'
  | 'comparison'
  | 'salesrobot'
  | 'faq'
  | 'conclusion';

export type BlogType =
  | 'how-to'
  | 'listicle'
  | 'guide'
  | 'comparison'
  | 'alternatives'
  | 'best-of'
  | 'review'
  | 'deep-dive'
  | 'vs-comparison';

export interface FunnelStageConfig {
  stage: FunnelStage;
  intent: string;
  blogTypes: BlogType[];
  sections: BlogSection[];
}

export const FUNNEL_STAGES: Record<FunnelStage, FunnelStageConfig> = {
  TOFU: {
    stage: 'TOFU',
    intent: 'informational',
    blogTypes: ['how-to', 'listicle', 'guide'],
    sections: ['tldr', 'intro', 'body_sections', 'salesrobot', 'faq', 'conclusion'],
  },
  MOFU: {
    stage: 'MOFU',
    intent: 'investigational',
    blogTypes: ['comparison', 'alternatives', 'best-of'],
    sections: [
      'tldr',
      'intro',
      'comparison_table',
      'alternatives',
      'salesrobot',
      'faq',
      'conclusion',
    ],
  },
  BOFU: {
    stage: 'BOFU',
    intent: 'transactional',
    blogTypes: ['review', 'deep-dive', 'vs-comparison'],
    sections: [
      'tldr',
      'intro',
      'pros_cons',
      'features',
      'pricing',
      'comparison',
      'salesrobot',
      'faq',
      'conclusion',
    ],
  },
};
