import { z } from 'zod'

export const MAX_REASON_LENGTH = 110
export const MAX_SUMMARY_LENGTH = 160

const singleLine = (value: string) => value.trim() === value && !/[\r\n]/.test(value)

export const RecommendationItemSchema = z.strictObject({
  itemId: z.number().int().positive(),
  itemName: z.string().min(1).max(80).refine(singleLine, 'Use one trimmed line'),
  priority: z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW']),
  reason: z.string().min(1).max(MAX_REASON_LENGTH).refine(singleLine, 'Use one trimmed line'),
})

/** A successful result always contains three distinct, brief item options. */
export const RecommendationResultSchema = z.strictObject({
  champion: z.string().min(1).max(50).refine(singleLine, 'Use one trimmed line'),
  recommendedItems: z.array(RecommendationItemSchema).length(3)
    .refine((items) => new Set(items.map((item) => item.itemId)).size === items.length, {
      error: 'Recommended item IDs must be distinct',
    }),
  summary: z.string().min(1).max(MAX_SUMMARY_LENGTH).refine(singleLine, 'Use one trimmed line'),
})

export type RecommendationItem = z.infer<typeof RecommendationItemSchema>
export type RecommendationResult = z.infer<typeof RecommendationResultSchema>
