export const brand = {
  name: 'SalesRobot',
  url: 'https://www.salesrobot.co',
  colors: {
    primary: '#6C5CE7',
    primaryLight: '#A29BFE',
    accent: '#00D2FF',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
    dark: '#1A1A2E',
    background: '#0F0F0F',
    white: '#FFFFFF',
    neutral: '#6B7280',
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
} as const;

export type BrandColors = typeof brand.colors;
