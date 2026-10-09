import { ProfileForm } from "@/components/features/profile/profile-form";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { LockIcon, UsersIcon } from "@/components/shared/icons";
import { signOutAction } from "@/lib/auth/actions";
import { unwrapForPage } from "@/lib/data/page-guards";
import { getCurrentProfile, getProfileStats } from "@/lib/data/profile";

export default async function ProfilePage() {
  const [profileResult, statsResult] = await Promise.all([getCurrentProfile(), getProfileStats()]);
  const profile = unwrapForPage(profileResult);
  const stats = statsResult.ok ? statsResult.data : null;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />
      <header className="flex items-center gap-4">
        <span aria-hidden="true" className="font-display flex size-16 items-center justify-center rounded-full bg-[var(--color-green)] text-2xl text-white">{profile.display_name.charAt(0).toUpperCase()}</span>
        <div>
          <h1 className="title-xl">{profile.display_name}</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {stats
              ? `${stats.rooms} ${stats.rooms === 1 ? "room" : "rooms"} · ${stats.memories} ${stats.memories === 1 ? "memory" : "memories"} written`
              : "Collecting ordinary, lovely days — one photo at a time."}
          </p>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ProfileForm displayName={profile.display_name} />

        <section className="panel grid content-start gap-4 p-5">
          <h2 className="title-md flex items-center gap-2"><LockIcon className="size-4" /> Your privacy</h2>
          <ul className="grid gap-3 text-sm">
            <li className="flex gap-3"><LockIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-sage-strong)]" /><span><b className="block text-[0.85rem] text-[var(--color-green-deep)]">Rooms are private</b><span className="text-xs text-[var(--color-muted)]">Each room is visible only to its owner and one invited member.</span></span></li>
            <li className="flex gap-3"><UsersIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-sage-strong)]" /><span><b className="block text-[0.85rem] text-[var(--color-green-deep)]">Just the two of you</b><span className="text-xs text-[var(--color-muted)]">No public sharing, no social feed.</span></span></li>
          </ul>
          <form action={signOutAction}>
            <button className="btn btn-secondary" type="submit">Sign out</button>
          </form>
        </section>
      </div>
    </div>
  );
}
