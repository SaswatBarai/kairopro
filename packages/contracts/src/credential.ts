import { z } from "zod";

export const CredentialServiceSchema = z.enum([
  "google_oauth",
  "stripe",
  "sendgrid",
  "aws_s3",
]);

export const CredentialFieldDefSchema = z.object({
  /** Camel-case field key used in `PutCredentialInput.values`. */
  key: z.string(),
  label: z.string(),
  /** Env var that satisfies this field in dev, e.g. `STRIPE_SECRET_KEY`. */
  envKey: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  secret: z.boolean(),
});

export const ServiceDefSchema = z.object({
  id: CredentialServiceSchema,
  label: z.string(),
  description: z.string(),
  fields: z.array(CredentialFieldDefSchema).min(1),
});

/**
 * The single source of truth for what each service requires — consumed by
 * the credentials page, the credential routes, and the agent's env
 * generation so the three can never drift.
 */
export const SERVICE_REGISTRY: readonly ServiceDef[] = [
  {
    id: "google_oauth",
    label: "Google OAuth",
    description: "Sign-in for generated apps",
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        envKey: "GOOGLE_CLIENT_ID",
        secret: false,
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        envKey: "GOOGLE_CLIENT_SECRET",
        secret: true,
      },
    ],
  },
  {
    id: "stripe",
    label: "Stripe",
    description: "Payments for generated apps",
    fields: [
      {
        key: "secretKey",
        label: "Secret Key",
        envKey: "STRIPE_SECRET_KEY",
        secret: true,
      },
    ],
  },
  {
    id: "sendgrid",
    label: "SendGrid",
    description: "Transactional email for generated apps",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        envKey: "SENDGRID_API_KEY",
        secret: true,
      },
    ],
  },
  {
    id: "aws_s3",
    label: "AWS S3",
    description: "Asset storage for generated apps",
    fields: [
      {
        key: "accessKeyId",
        label: "Access Key ID",
        envKey: "AWS_ACCESS_KEY_ID",
        secret: false,
      },
      {
        key: "secretAccessKey",
        label: "Secret Access Key",
        envKey: "AWS_SECRET_ACCESS_KEY",
        secret: true,
      },
    ],
  },
];

export const CredentialStatusSchema = z.enum([
  "CONNECTED",
  "UNCONFIGURED",
  "UNUSED",
]);

/** What the credentials page renders: never a raw value until revealed. */
export const CredentialFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  maskedValue: z.string(),
});

export const ServiceCredentialsSchema = z.object({
  service: CredentialServiceSchema,
  status: CredentialStatusSchema,
  fields: z.array(CredentialFieldSchema),
});

export const ServiceCredentialsListSchema = z.array(ServiceCredentialsSchema);

export const PutCredentialInputSchema = z
  .object({
    service: CredentialServiceSchema,
    values: z.record(z.string(), z.string()),
  })
  .refine((input) => Object.keys(input.values).length > 0, {
    message: "values must not be empty",
  });

export type CredentialService = z.infer<typeof CredentialServiceSchema>;
export type CredentialFieldDef = z.infer<typeof CredentialFieldDefSchema>;
export type ServiceDef = z.infer<typeof ServiceDefSchema>;
export type CredentialStatus = z.infer<typeof CredentialStatusSchema>;
export type CredentialField = z.infer<typeof CredentialFieldSchema>;
export type ServiceCredentials = z.infer<typeof ServiceCredentialsSchema>;
export type ServiceCredentialsList = z.infer<
  typeof ServiceCredentialsListSchema
>;
export type PutCredentialInput = z.infer<typeof PutCredentialInputSchema>;
