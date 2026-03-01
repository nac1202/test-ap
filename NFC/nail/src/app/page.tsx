import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();

  let userHandle = null;
  if (session?.user?.id) {
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { handle: true }
    });
    userHandle = profile?.handle;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            NFC Linkへようこそ
          </h1>
          <p className="mt-3 text-xl text-gray-500">
            あなたのすべてのリンクを1か所にまとめましょう。
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 justify-center sm:flex-row">
          {session ? (
            <>
              <Link
                href="/settings"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
              >
                設定へ移動
              </Link>
              {userHandle ? (
                <Link
                  href={`/u/${userHandle}`}
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10"
                >
                  マイページ
                </Link>
              ) : (
                <SpanWrapper className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-300 bg-indigo-50 cursor-not-allowed md:py-4 md:text-lg md:px-10">
                  マイページ (未設定)
                </SpanWrapper>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
            >
              ログイン / 登録
            </Link>
          )}

          {!session && (
            <div className="mt-4 text-sm text-gray-400">
              ログインしてプロフィールを作成しましょう
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to avoid hydration issues if needed, but span is fine
function SpanWrapper({ children, className }: { children: React.ReactNode, className: string }) {
  return <span className={className}>{children}</span>
}
