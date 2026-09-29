import type { RecommendationResult } from '../recommendations/recommendationResult'

/** Illustrative healing-heavy Brand scenario; not computed from the current match. */
export const mockRecommendationResult: RecommendationResult = {
  champion: 'Brand',
  recommendedItems: [
    {
      itemId: 3165,
      itemName: 'Morellonomicon',
      priority: 'VERY_HIGH',
      reason: 'Cuts healing across a sustain-heavy enemy team.',
    },
    {
      itemId: 2503,
      itemName: 'Blackfire Torch',
      priority: 'HIGH',
      reason: 'Adds sustained damage if anti-heal is already covered.',
    },
    {
      itemId: 3116,
      itemName: "Rylai's Crystal Scepter",
      priority: 'MEDIUM',
      reason: 'Adds slows to help control mobile targets.',
    },
  ],
  summary: 'Mock healing-heavy matchup: anti-heal first, with damage and control alternatives.',
}
