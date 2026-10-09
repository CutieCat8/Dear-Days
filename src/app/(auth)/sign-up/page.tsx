import { AuthScreen } from "@/components/features/auth/auth-screen";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const raw = Array.isArray(next) ? next[0] : next;
  const safe = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  return <AuthScreen mode="sign-up" next={safe} />;
}
