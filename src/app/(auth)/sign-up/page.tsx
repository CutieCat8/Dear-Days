import { AuthScreen } from "@/components/features/auth/auth-screen";
import { safeNextPath } from "@/lib/auth/paths";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const safe = safeNextPath(next);
  return <AuthScreen mode="sign-up" next={safe} />;
}
