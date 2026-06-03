export type Category = {
  slug: string
  label: string
  policyAreas: string[]
}

export const CATEGORIES: Category[] = [
  { slug: 'health', label: 'Health', policyAreas: ['Health'] },
  { slug: 'education', label: 'Education', policyAreas: ['Education'] },
  { slug: 'taxes', label: 'Taxes', policyAreas: ['Taxation'] },
  { slug: 'jobs', label: 'Jobs & Workers', policyAreas: ['Labor and Employment'] },
  { slug: 'economy', label: 'Economy & Budget', policyAreas: ['Economics and Public Finance'] },
  { slug: 'banking', label: 'Banking & Finance', policyAreas: ['Finance and Financial Sector'] },
  { slug: 'housing', label: 'Housing', policyAreas: ['Housing and Community Development'] },
  { slug: 'safety-net', label: 'Social Safety Net', policyAreas: ['Social Welfare'] },
  { slug: 'families', label: 'Families', policyAreas: ['Families'] },
  {
    slug: 'civil-rights',
    label: 'Civil Rights',
    policyAreas: ['Civil Rights and Liberties, Minority Issues'],
  },
  { slug: 'immigration', label: 'Immigration', policyAreas: ['Immigration'] },
  { slug: 'crime', label: 'Crime & Justice', policyAreas: ['Crime and Law Enforcement'] },
  { slug: 'law', label: 'Law & Courts', policyAreas: ['Law'] },
  {
    slug: 'military',
    label: 'Military & National Security',
    policyAreas: ['Armed Forces and National Security'],
  },
  { slug: 'foreign-affairs', label: 'Foreign Affairs', policyAreas: ['International Affairs'] },
  { slug: 'trade', label: 'Trade', policyAreas: ['Foreign Trade and International Finance'] },
  { slug: 'commerce', label: 'Commerce & Business', policyAreas: ['Commerce'] },
  {
    slug: 'transportation',
    label: 'Transportation',
    policyAreas: ['Transportation and Public Works'],
  },
  { slug: 'energy', label: 'Energy', policyAreas: ['Energy'] },
  { slug: 'environment', label: 'Environment', policyAreas: ['Environmental Protection'] },
  {
    slug: 'public-lands',
    label: 'Public Lands',
    policyAreas: ['Public Lands and Natural Resources'],
  },
  { slug: 'water', label: 'Water', policyAreas: ['Water Resources Development'] },
  { slug: 'agriculture', label: 'Agriculture & Food', policyAreas: ['Agriculture and Food'] },
  { slug: 'animals', label: 'Animals', policyAreas: ['Animals'] },
  { slug: 'emergencies', label: 'Emergencies & Disasters', policyAreas: ['Emergency Management'] },
  {
    slug: 'science-tech',
    label: 'Science & Tech',
    policyAreas: ['Science, Technology, Communications'],
  },
  {
    slug: 'government',
    label: 'Government & Politics',
    policyAreas: ['Government Operations and Politics', 'Congress'],
  },
  { slug: 'native-americans', label: 'Native Americans', policyAreas: ['Native Americans'] },
  { slug: 'arts-culture', label: 'Arts & Culture', policyAreas: ['Arts, Culture, Religion'] },
  { slug: 'sports', label: 'Sports & Recreation', policyAreas: ['Sports and Recreation'] },
  {
    slug: 'social-sciences',
    label: 'Social Sciences',
    policyAreas: ['Social Sciences and History'],
  },
]

const POLICY_AREA_TO_CATEGORY = new Map<string, Category>()
const SLUG_TO_CATEGORY = new Map<string, Category>()
for (const cat of CATEGORIES) {
  SLUG_TO_CATEGORY.set(cat.slug, cat)
  for (const p of cat.policyAreas) POLICY_AREA_TO_CATEGORY.set(p, cat)
}

export function categoryForPolicyArea(policyArea?: string | null): Category | null {
  if (!policyArea) return null
  return POLICY_AREA_TO_CATEGORY.get(policyArea) ?? null
}

export function categoryBySlug(slug?: string | null): Category | null {
  if (!slug) return null
  return SLUG_TO_CATEGORY.get(slug) ?? null
}

export function categoryLabel(policyArea?: string | null): string | null {
  return categoryForPolicyArea(policyArea)?.label ?? policyArea ?? null
}
