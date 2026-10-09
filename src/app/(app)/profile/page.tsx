import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { redirect } from "next/navigation";

import { ProfileForm, SignOutButton } from "@/components/features/profile/profile-form";
import { LockIcon, UsersIcon } from "@/components/shared/icons";
import { getMyAccount } from "@/lib/data/profile";
import { dataMode } from "@/lib/data/config";
import { getViewer } from "@/lib/data/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/data/unwrap";

export default async function ProfilePage() {
  const viewer = await getViewer();
  const profile = dataMode() === "mock" ? viewer : unwrap(await getMyAccount(await createSupabaseServerClient()));
  if (!profile) redirect("/sign-in");
  const name = profile.display_name;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />
      <header className="flex items-center gap-4">
        <span aria-hidden="true" className="font-display flex size-16 items-center justify-center rounded-full bg-[var(--color-green)] text-2xl text-white">{name.charAt(0)}</span>
        <div>
          <h1 className="title-xl">{name}</h1>
          <p className="text-sm text-[var(--color-muted)]">{profile.bio || "Collecting ordinary, lovely days — one photo at a time."}</p>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ProfileForm bio={profile.bio ?? null} displayName={name} email={profile.email ?? null} />

        <section className="panel grid content-start gap-4 p-5">
          <h2 className="title-md flex items-center gap-2"><LockIcon className="size-4" /> Your privacy</h2>
          <ul className="grid gap-3 text-sm">
            <li className="flex gap-3"><LockIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-sage-strong)]" /><span><b className="block text-[0.85rem] text-[var(--color-green-deep)]">Rooms are private</b><span className="text-xs text-[var(--color-muted)]">Each room is visible only to its owner and one invited member.</span></span></li>
            <li className="flex gap-3"><UsersIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-sage-strong)]" /><span><b className="block text-[0.85rem] text-[var(--color-green-deep)]">Just the two of you</b><span className="text-xs text-[var(--color-muted)]">No public sharing, no social feed.</span></span></li>
          </ul>
          <SignOutButton />
        </section>
      </div>
    </div>
  );
}
