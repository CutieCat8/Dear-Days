import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { LockIcon, UsersIcon } from "@/components/shared/icons";
import { signOutAction } from "@/lib/auth/actions";

// TODO(T5/T19): replace placeholder values with the authenticated profile.
export default function ProfilePage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />
      <header className="flex items-center gap-4">
        <span aria-hidden="true" className="font-display flex size-16 items-center justify-center rounded-full bg-[var(--color-green)] text-2xl text-white">S</span>
        <div>
          <h1 className="title-xl">Sea</h1>
          <p className="text-sm text-[var(--color-muted)]">Collecting ordinary, lovely days — one photo at a time.</p>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <form className="panel grid gap-4 p-5">
          <div>
            <h2 className="title-md">Account settings</h2>
            <p className="text-xs text-[var(--color-muted)]">Keep your information up to date.</p>
          </div>
          <div>
            <label className="field-label" htmlFor="display-name">Display name</label>
            <input className="field-input" defaultValue="Sea" id="display-name" name="display_name" />
          </div>
          <div>
            <label className="field-label" htmlFor="bio">About you <small>(optional)</small></label>
            <textarea className="field-input !min-h-24" defaultValue="Collecting little moments, big feelings, and the places that make life brighter." id="bio" maxLength={160} name="bio" />
          </div>
          <button className="btn btn-primary self-start" type="button">Save changes</button>
        </form>

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
