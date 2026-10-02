import { z } from "zod";

type Messages = {jobName: string; jobNameLength: string; jobNameUnsafe: string; email: string};
export function taskMetadataSchema(messages: Messages) {
  return z.object({
    jobName: z.string().trim().min(1, messages.jobName).max(64, messages.jobNameLength)
      .refine(value => !value.includes(".."), messages.jobNameUnsafe)
      .refine(value => /^[\p{L}\p{N}_ .()（）-]+$/u.test(value), messages.jobNameUnsafe),
    email: z.string().trim().refine(value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), messages.email)
  });
}
