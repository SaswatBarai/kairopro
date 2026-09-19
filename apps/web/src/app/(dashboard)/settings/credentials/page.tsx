import { redirect } from "next/navigation";

export default function CredentialsSettingsPage() {
  redirect("/dashboard?tab=settings&sub=credentials");
}
