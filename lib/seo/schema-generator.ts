import { ContentBrief } from '../types';

const SITE_URL = 'https://www.salesrobot.co';
const SITE_NAME = 'SalesRobot';

export function generateFAQSchema(questions: { question: string; answer: string }[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };
  return JSON.stringify(schema, null, 2);
}

export function generateArticleSchema(brief: ContentBrief): string {
  const now = new Date().toISOString();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: brief.h1,
    description: brief.blogTitle,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    datePublished: now,
    dateModified: now,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': SITE_URL,
    },
  };
  return JSON.stringify(schema, null, 2);
}
