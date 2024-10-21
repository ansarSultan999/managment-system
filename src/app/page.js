
import Link from "next/link";
export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
       <h1 className="text-5xl font-bold">Team Managment</h1>
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link href="/Dashboard"
           className="dark:invert bg-yellow-200 p-4 rounded-md text-2xl "
          >
            Sign Up Page
          </Link>
          <Link href="/Login"
              className="dark:invert bg-yellow-200 p-4 rounded-md text-2xl "
            >
            Sign In  Page
          </Link>
        </div>
      </main>
    </div>
  );
}
