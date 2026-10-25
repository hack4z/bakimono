import { A } from "@solidjs/router";
import { ArrowUpRight, Menu } from "lucide-solid";
import ThemeToggle from "~/components/ThemeToggle";

export default function Nav() {
  return (
    <header class="border-b border-dust-grey-700 bg-dust-grey-900">
      <nav
        aria-label="Main navigation"
        class="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12"
      >
        <A href="/" aria-label="Bakimono home" class="group flex items-center gap-3">
          <span>
            <img
              src="/logo_pack/logo-horizontal.svg"
              alt="Bakimono"
              class="h-8 w-auto dark:hidden sm:h-9"
            />
            <img
              src="/logo_pack/logo-horizontal-on-dark.svg"
              alt="Bakimono"
              class="hidden h-8 w-auto dark:block sm:h-9"
            />
            <span class="mt-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-dust-grey-300">
              stay · dine · unwind
            </span>
          </span>
        </A>

        <div class="hidden items-center gap-9 md:flex">
          <A href="/explore" class="text-sm text-dust-grey-200 transition hover:text-hunter-green-500">
            Stays
          </A>
          <A href="/explore" class="text-sm text-dust-grey-200 transition hover:text-hunter-green-500">
            Dining
          </A>
          <A href="/explore" class="text-sm text-dust-grey-200 transition hover:text-hunter-green-500">
            Experiences
          </A>
          <A href="/provider" class="text-sm font-semibold text-hunter-green-500 transition hover:text-fern-500">
            For providers
          </A>
        </div>

        <div class="flex items-center gap-3">
          <ThemeToggle />
          <A
            href="/login"
            class="hidden text-sm font-medium text-hunter-green-500 transition hover:text-fern-500 sm:inline"
          >
            Log in
          </A>
          <A
            href="/signup"
            class="hidden items-center gap-1.5 rounded-full bg-hunter-green-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-hunter-green-400 sm:inline-flex"
          >
            Sign up <ArrowUpRight size={15} aria-hidden="true" />
          </A>
          <details class="relative md:hidden">
            <summary
              aria-label="Open menu"
              class="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-dust-grey-600 text-dust-grey-200 marker:hidden"
            >
              <Menu size={19} aria-hidden="true" />
            </summary>
            <div class="absolute right-0 top-12 z-10 flex w-48 flex-col gap-1 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 p-2 shadow-xl">
              <A href="/explore" class="rounded-xl px-3 py-2.5 text-sm text-dust-grey-200 hover:bg-dust-grey-800">
                Stays
              </A>
              <A href="/explore" class="rounded-xl px-3 py-2.5 text-sm text-dust-grey-200 hover:bg-dust-grey-800">
                Dining
              </A>
              <A href="/explore" class="rounded-xl px-3 py-2.5 text-sm text-dust-grey-200 hover:bg-dust-grey-800">
                Experiences
              </A>
              <A href="/provider" class="rounded-xl px-3 py-2.5 text-sm font-semibold text-hunter-green-500 hover:bg-dust-grey-800">
                For providers
              </A>
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
}
