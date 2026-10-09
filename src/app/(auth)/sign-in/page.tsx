import { AuthScreen } from "@/components/features/auth/auth-screen";
import { safeNextPath } from "@/lib/auth/paths";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const safe = safeNextPath(next);
  return <AuthScreen mode="sign-in" next={safe} />;
}
