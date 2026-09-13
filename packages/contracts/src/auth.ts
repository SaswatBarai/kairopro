import { z } from "zod";

export const RegisterInputSchema = z.object({
  name: z.string().min(1).max(60),
  email: z.email(),
  password: z.string().min(8).max(100),
});

/** Login deliberately does not enforce the password-length floor. */
export const LoginInputSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/** What the session holder looks like to every authenticated route. */
export const SessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  orgId: z.string(),
  orgName: z.string(),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type SessionUser = z.infer<typeof SessionUserSchema>;
