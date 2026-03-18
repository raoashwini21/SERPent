import { BlogSection } from './funnel-stages';

export interface CTATemplate {
  id: string;
  type: 'free-trial' | 'demo' | 'whitelabel' | 'comparison';
  text: string;
  url: string;
  placementHint: BlogSection[];
}

export const CTA_TEMPLATES: CTATemplate[] = [
  {
    id: 'free-trial',
    type: 'free-trial',
    text: "If you want to try {product} yourself, you can start a 14-day free trial — no credit card needed. Takes about 2 minutes to set up.",
    url: 'https://www.salesrobot.co/signup',
    placementHint: ['intro', 'body_sections', 'salesrobot', 'conclusion'],
  },
  {
    id: 'demo',
    type: 'demo',
    text: "Not sure if {product} is right for you? There's a 7-minute demo video that walks you through exactly how it works — worth a watch before you decide.",
    url: 'https://www.salesrobot.co/demo',
    placementHint: ['salesrobot', 'conclusion', 'faq'],
  },
  {
    id: 'whitelabel',
    type: 'whitelabel',
    text: "If you run an agency, {product} also has a white-label option — you can resell it under your own brand without building anything from scratch.",
    url: 'https://www.salesrobot.co/whitelabel',
    placementHint: ['salesrobot', 'alternatives', 'conclusion'],
  },
  {
    id: 'comparison',
    type: 'comparison',
    text: "We've put together a full comparison of {product} vs the top alternatives if you want to see how they stack up side by side.",
    url: 'https://www.salesrobot.co/compare',
    placementHint: ['comparison_table', 'alternatives', 'faq'],
  },
];
