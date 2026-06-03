export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
  PR: 'Puerto Rico',
  VI: 'U.S. Virgin Islands',
  GU: 'Guam',
  MP: 'Northern Mariana Islands',
  AS: 'American Samoa',
}

export function formatState(code?: string | null): string {
  if (!code) return ''
  return STATE_NAMES[code.toUpperCase()] ?? code
}

const STATE_CODE_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
)

export function stateNameToCode(name?: string | null): string | null {
  if (!name) return null
  return STATE_CODE_BY_NAME[name.toLowerCase()] ?? null
}

export type PartyValue = 'Democrat' | 'Republican' | 'Independent'

export function normalizeParty(raw?: string | null): PartyValue | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (v.startsWith('democrat')) return 'Democrat'
  if (v.startsWith('republican')) return 'Republican'
  if (v.startsWith('independent')) return 'Independent'
  return null
}

export function formatParty(party?: string | null): string {
  return normalizeParty(party) ?? 'Independent'
}

type MemberLike = {
  state?: string | null
  stateName?: string | null
  district?: number | null
  chamber?: string | null
}

export function formatDistrict(member: MemberLike): string {
  const state = member.stateName || formatState(member.state)
  if (!state) return ''
  if (member.chamber === 'Senate') return `${state} (Senator)`
  if (member.district == null) return state
  return `${state}, District ${member.district}`
}

export function formatBillId(billType: string, billNumber: number): string {
  const map: Record<string, string> = {
    hr: 'H.R.',
    hjres: 'H.J.Res.',
    hconres: 'H.Con.Res.',
    hres: 'H.Res.',
    s: 'S.',
    sjres: 'S.J.Res.',
    sconres: 'S.Con.Res.',
    sres: 'S.Res.',
  }
  return `${map[billType] ?? billType.toUpperCase()} ${billNumber}`
}

export function formatBillHeadline(billType: string, billNumber: number): string {
  return billType.startsWith('h') && (billType === 'hr' || billType === 'hjres')
    ? `Bill ${billNumber}`
    : formatBillId(billType, billNumber)
}

const ACTION_PREFIXES: Array<[RegExp, string]> = [
  [/^became public law/i, 'Signed into law'],
  [/^signed by president/i, 'Signed by the President'],
  [/^presented to president/i, 'Sent to the President'],
  [/^passed\/agreed to in house/i, 'Passed the House'],
  [/^passed\/agreed to in senate/i, 'Passed the Senate'],
  [/^received in the senate/i, 'Sent to the Senate'],
  [/^received in the house/i, 'Sent to the House'],
  [/^placed on the union calendar/i, 'Scheduled for House floor'],
  [/^placed on senate legislative calendar/i, 'Scheduled for Senate floor'],
  [/^reported by/i, 'Reported out of committee'],
  [/^referred to (the )?(house |senate )?committee/i, 'Sent to committee'],
  [/^referred to the subcommittee/i, 'Sent to subcommittee'],
  [/^introduced in house/i, 'Introduced'],
  [/^introduced in senate/i, 'Introduced'],
]

export function humanizeActionPrefix(text?: string | null): string | null {
  if (!text) return null
  for (const [re, label] of ACTION_PREFIXES) {
    if (re.test(text)) return label
  }
  return null
}

export function formatDate(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
