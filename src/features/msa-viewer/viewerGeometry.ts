export const AXIS_HEIGHT = 24;
export const TRACK_HEIGHT = 28;
export const LOGO_HEIGHT = 48;
export const CONSENSUS_HEIGHT = 24;
export const MATCH_HEIGHT = 20;
export function frozenHeight(tracks: number, logo: boolean, consensus: boolean, matches = false) {
  return AXIS_HEIGHT + tracks * TRACK_HEIGHT + (logo ? LOGO_HEIGHT : 0) +
    (consensus ? CONSENSUS_HEIGHT : 0) + (matches ? MATCH_HEIGHT : 0);
}
