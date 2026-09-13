import { redirect } from "next/navigation";

export default function BillingSettingsPage() {
  redirect("/dashboard?tab=settings");
}
