import Image from "next/image";
import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/features/profile/change-password-form";
import { MoodOverview } from "@/components/features/profile/mood-overview";
import { ProfileForm, SignOutButton } from "@/components/features/profile/profile-form";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { HomeIcon, LockIcon, LogOutIcon, ShieldIcon, UsersIcon } from "@/components/shared/icons";
import { DEFAULT_ROOM_COVER_IMAGE } from "@/components/shared/room-cover";
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

      <header>
        {/* TODO(R7): cover and avatar uploads need a Storage UI; until then the default cover and the initial are shown. */}
        <div className="relative h-32 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-sage)] sm:h-40">
          <Image alt="" className="object-cover" fill priority sizes="(max-width: 1024px) 100vw, 1100px" src={DEFAULT_ROOM_COVER_IMAGE} />
          <p aria-hidden="true" className="font-display absolute bottom-4 right-6 hidden -rotate-6 text-2xl italic leading-tight text-white/90 drop-shadow sm:block">Good days<br />&nbsp;&nbsp;live here</p>
        </div>
        <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-end sm:gap-5 sm:px-8">
          <span aria-hidden="true" className="font-display relative z-10 -mt-12 flex size-24 shrink-0 items-center justify-center self-start overflow-hidden rounded-full border-4 border-[var(--color-paper)] bg-[var(--color-green)] text-4xl text-white shadow-[var(--shadow-soft)] sm:-mt-16 sm:size-32">
            {viewer.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar URLs are not optimizable here
              <img alt="" className="size-full object-cover" src={viewer.avatar_url} />
            ) : name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 pb-1">
            <h1 className="title-xl">{name}</h1>
            {viewer.email ? <p className="truncate text-sm text-[var(--color-muted)]">{viewer.email}</p> : null}
            <p className="mt-1 max-w-md text-sm leading-6 text-[var(--color-muted)]">{viewer.bio || "Collecting ordinary, lovely days — one photo at a time."}</p>
          </div>
          {overview.ok ? (
            <dl className="flex gap-6 pb-1 sm:ml-auto">
              {[{ label: "memories", value: overview.data.memoryCount }, { label: "rooms", value: overview.data.roomCount }].map(({ label, value }) => (
                <div className="flex flex-col-reverse items-center" key={label}>
                  <dt className="text-[0.7rem] text-[var(--color-muted)]">{label}</dt>
                  <dd className="font-display text-base leading-tight text-[var(--color-green-deep)]">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </header>

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
