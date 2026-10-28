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

// Names a job the user left unnamed, e.g. "Alignment-20261028-142233".
export function defaultJobName(prefix: string, now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}-${date}-${time}`;
}
