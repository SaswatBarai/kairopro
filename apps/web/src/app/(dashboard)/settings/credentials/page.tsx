import type { Metadata } from "next";

import { CredentialsSettings } from "@/components/settings/credentials-settings";

export const metadata: Metadata = {
  title: "Service Credentials — KairoPro",
};

export default function CredentialsSettingsPage() {
  return <CredentialsSettings />;
}
