import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <ProfileForm defaultValues={{ name: user.name, avatar: user.avatar ?? "" }} />
    </div>
  );
}
