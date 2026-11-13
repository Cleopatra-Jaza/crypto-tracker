import { connection } from "next/server";
import { auth, signIn, signOut } from "@/auth";

const googleEnabled =
  typeof process.env.AUTH_GOOGLE_ID === "string" &&
  process.env.AUTH_GOOGLE_ID.length > 0 &&
  typeof process.env.AUTH_GOOGLE_SECRET === "string" &&
  process.env.AUTH_GOOGLE_SECRET.length > 0;

export default async function AuthButton() {
  await connection();
  const session = await auth();

  if (session?.user) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="max-w-[6rem] truncate md:max-w-[10rem]">
          {session.user.name ?? session.user.email}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-gray-500 px-2 py-1 text-sm min-h-10 md:min-h-0 md:px-4 md:py-2"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <details className="relative">
      <summary
        className="rounded-lg border border-gray-500 px-3 py-1 text-sm min-h-10 md:min-h-0 md:px-4 md:py-2 list-none cursor-pointer"
      >
        Sign in
      </summary>
      <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-500 bg-white text-black dark:bg-neutral-900 dark:text-white p-2 z-50 flex flex-col gap-2">
        <form
          action={async () => {
            "use server";
            await signIn("github");
          }}
        >
          <button
            type="submit"
            className="w-full text-left rounded-lg border-none bg-transparent px-2 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 text-sm"
          >
            Continue with GitHub
          </button>
        </form>
        {googleEnabled && (
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button
              type="submit"
              className="w-full text-left rounded-lg border-none bg-transparent px-2 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 text-sm"
            >
              Continue with Google
            </button>
          </form>
        )}
      </div>
    </details>
  );
}
