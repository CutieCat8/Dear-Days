import { AuthScreen } from "@/components/features/auth/auth-screen";
import { safeNextPath } from "@/lib/auth/paths";

type SignUpPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { next } = await searchParams;
  return <AuthScreen mode="sign-up" next={safeNextPath(next)} />;
}
