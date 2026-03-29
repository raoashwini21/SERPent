export interface BlogConfig {
  url?: string;
  topic: string;
  category?: string;
  blogType: string;
}

export interface KeywordData {
  primaryKeyword: string;
  searchVolume?: number;
  keywordDifficulty?: number;
  secondaryKeywords: {
    keyword: string;
    volume?: number;
    difficulty?: number;
  }[];
  longTailKeywords: string[];
  peopleAlsoAsk: string[];
  keywordGroups: Record<string, string[]>;
}

export interface SERPResult {
  title: string;
  url: string;
  snippet: string;
  wordCount?: number;
  headings?: string[];
}

export interface SERPAnalysis {
  results: SERPResult[];
  avgWordCount: number;
  contentGaps: string[];
  searchIntent: string;
  mustHaveSections: string[];
  headingSuggestions: string[];
}

export interface SectionBrief {
  id: string;
  heading: string;
  headingTag: 'h2' | 'h3';
  targetKeywords: string[];
  paaToAnswer?: string[];
  wordCountTarget: number;
  instructions: string;
  infographicType:
    | 'comparison'
    | 'pros_cons'
    | 'features'
    | 'pricing'
    | 'workflow'
    | 'stats'
    | 'none';
}

export interface ContentBrief {
  blogTitle: string;
  h1: string;
  contentType: string;
  targetWordCount: number;
  sections: SectionBrief[];
}

export interface ResearchBrief {
  productName: string;
  oneLiner: string;
  features: {
    name: string;
    description: string;
    rating?: number;
  }[];
  pricing: {
    plans: {
      name: string;
      price: string;
      features: string[];
    }[];
    freeTrial: boolean;
  };
  pros: string[];
  cons: string[];
  targetAudience: string;
  competitors: string[];
  g2Rating?: number;
  capterraRating?: number;
  keyDifferentiators: string[];
}

export interface SEOCheck {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string;
}

export interface SEOScore {
  overall: number;
  checks: SEOCheck[];
  suggestions: string[];
}

export interface GenerationEvent {
  event: string;
  data: unknown;
}

// ─── Webflow ──────────────────────────────────────────────────────────────────

export interface WebflowBlog {
  id: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  postBody: string;
  publishedAt: string;
}

export interface WebflowBlogUpdate {
  postBody?: string;
  metaTitle?: string;
  metaDescription?: string;
  excerpt?: string;
}

// ─── GSC ─────────────────────────────────────────────────────────────────────

export interface GSCKeyword {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// ─── Blog Update Analysis ─────────────────────────────────────────────────────

export interface UpdateChange {
  type: string;
  description: string;
  before?: string;
  after?: string;
}

export interface BlogUpdateAnalysis {
  contentIssues: {
    outdatedFacts: { quote: string; issue: string; suggestedFix: string }[];
    yearReferences: { quote: string; oldYear: number; context: string }[];
    brokenClaims: { quote: string; issue: string }[];
  };
  seoIssues: string[];
  suggestedFixes: string[];
  missingSections: string[];
  keywordGaps: string[];
  gscQuickWins?: GSCKeyword[];
  gscMissing?: GSCKeyword[];
  webflowItemId?: string;
}
