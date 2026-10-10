import { z } from "zod";
export const metrics = [
  "ots",
  "observers",
  "attention_time",
  "dwell_time",
  "percent_v",
  "v",
  "vd",
] as const;
export const datasets = [
  "devices",
  "ots_summary",
  "ots_daily",
  "ots_hourly",
  "ots_by_site",
  "demographics",
  "demographics_daily",
  "demographics_hourly",
] as const;
export const intentSchema = z
  .object({
    dataset: z.enum(datasets),
    metric: z.enum(metrics),
    aggregation: z.enum([
      "SUM",
      "COUNT",
      "AVG",
      "LIST",
      "DETAIL",
      "TOP",
      "GROUP_BY",
      "COMPARE",
    ]),
    dimensions: z
      .array(z.enum(["site", "device", "day", "hour", "gender", "age"]))
      .max(3)
      .default(["site"]),
    limit: z.number().int().min(1).max(50).default(10),
    offset: z.number().int().min(0).max(49).default(0),
    filters: z
      .object({
        sites: z.array(z.string().max(100)).max(10).optional(),
        device: z.string().max(100).optional(),
        start: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        end: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        hourStart: z.number().int().min(0).max(23).optional(),
        hourEnd: z.number().int().min(0).max(23).optional(),
        gender: z.enum(["female", "male", "undefined"]).optional(),
        age: z
          .enum(["kid", "young", "adult", "senior", "undefined"])
          .optional(),
      })
      .strict(),
  })
  .strict();
export type AnalyticsIntent = z.infer<typeof intentSchema>;
