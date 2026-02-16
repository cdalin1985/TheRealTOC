export const MIN_RACE = 5;
export const MAX_RANK_DIFF = 5;

export const DISCIPLINES = {
  '8-ball': '8-ball',
  '9-ball': '9-ball',
  '10-ball': '10-ball',
} as const;

export const VENUES = {
  'valley-hub': 'Valley Hub',
  'eagles-4040': 'Eagles 4040',
} as const;

export type DisciplineId = keyof typeof DISCIPLINES;
export type VenueId = keyof typeof VENUES;

export const CHALLENGE_STATUSES = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
  venue_proposed: 'Venue Proposed',
  countered: 'Countered',
  locked: 'Locked',
} as const;

export const MATCH_STATUSES = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
} as const;
