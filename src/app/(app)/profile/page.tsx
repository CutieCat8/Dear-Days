import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/features/profile/change-password-form";
import { MoodOverview } from "@/components/features/profile/mood-overview";
import { ProfileMediaHeader } from "@/components/features/profile/profile-media-header";
import { ProfileForm, SignOutButton } from "@/components/features/profile/profile-form";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { HomeIcon, LockIcon, LogOutIcon, ShieldIcon, UsersIcon } from "@/components/shared/icons";
import { loadProfileOverview, parseMoodRange } from "@/lib/data/profile-overview";
import { getDataSource, getViewer } from "@/lib/data/server";

type ProfilePageProps = {
  searchParams: Promise<{ months?: string | string[] }>;
};

const PRIVACY_POINTS = [
  { icon: HomeIcon, title: "Rooms are private", text: "Each room is visible only to the owner and one invited member." },
  { icon: UsersIcon, title: "Just the two of you", text: "A room can have an owner (you) and one invited member. No public sharing, no social feed, no likes." },
  { icon: ShieldIcon, title: "Your content stays yours", text: "Your photos, notes and memories are kept private and only accessible by you and your invited member." },
];

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const [{ months }, viewer, source] = await Promise.all([searchParams, getViewer(), getDataSource()]);
  if (!viewer) redirect("/sign-in?next=%2Fprofile");
  const overview = await loadProfileOverview(source, viewer.id, parseMoodRange(months));
  const name = viewer.display_name;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />

      <ProfileMediaHeader
        avatarPath={viewer.avatar_path}
        avatarUrl={viewer.avatar_url}
        bio={viewer.bio}
        coverPath={viewer.cover_path}
        coverUrl={viewer.cover_url}
        email={viewer.email}
        key={`${viewer.avatar_url ?? "default-avatar"}:${viewer.cover_url ?? "default-cover"}`}
        memoryCount={overview.ok ? overview.data.memoryCount : undefined}
        name={name}
        roomCount={overview.ok ? overview.data.roomCount : undefined}
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className="panel grid content-start gap-6 p-5 sm:p-6">
          <ProfileForm bio={viewer.bio} displayName={name} email={viewer.email} username={viewer.username} />
          <hr className="border-[var(--color-border)]" />
          <ChangePasswordForm email={viewer.email} />
        </section>

        <div className="grid content-start gap-5">
          <section aria-labelledby="privacy-title" className="panel grid gap-4 p-5">
            <div>
              <h2 className="title-md flex items-center gap-2" id="privacy-title"><LockIcon className="size-4" /> Your privacy</h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">Dear Days is designed to be a private space for your personal memories.</p>
            </div>
            <ul className="grid gap-3.5">
              {PRIVACY_POINTS.map(({ icon: Icon, title, text }) => (
                <li className="flex gap-3" key={title}>
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-sage)]/70 text-[var(--color-green-deep)]"><Icon className="size-5" /></span>
                  <span><b className="block text-sm font-semibold text-[var(--color-green-deep)]">{title}</b><span className="text-xs leading-5 text-[var(--color-muted)]">{text}</span></span>
                </li>
              ))}
            </ul>
          </section>

          {overview.ok ? (
            <MoodOverview mood={overview.data.mood} />
          ) : (
            <p className="panel p-5 text-xs text-[var(--color-muted)]" role="status">Mood overview is not available right now.</p>
          )}

          <section className="panel flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-start gap-3">
              <LogOutIcon className="mt-0.5 size-5 text-[var(--color-green-deep)]" />
              <div>
                <h2 className="title-md">Sign out</h2>
                <p className="text-xs text-[var(--color-muted)]">You can always sign in again to access your rooms and memories.</p>
              </div>
            </div>
            <SignOutButton />
          </section>
        </div>
      </div>
    </div>
  );
}
