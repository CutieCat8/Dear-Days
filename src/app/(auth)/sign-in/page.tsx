import { AuthScreen } from "@/components/features/auth/auth-screen";
import { safeNextPath } from "@/lib/auth/paths";

type SignInPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next } = await searchParams;
  return <AuthScreen mode="sign-in" next={safeNextPath(next)} />;
}
