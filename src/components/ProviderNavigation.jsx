import { A } from "@solidjs/router";
import { Store } from "lucide-solid";
import ThemeToggle from "~/components/ThemeToggle";

export default function ProviderNavigation() {
  return (
    <nav
      aria-label="Provider navigation"
      class="fixed inset-x-0 bottom-0 z-50 border-t border-dust-grey-600 bg-dust-grey-900/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-lg lg:inset-y-0 lg:left-0 lg:right-auto lg:flex lg:w-[88px] lg:flex-col lg:items-center lg:border-r lg:border-t-0 lg:px-3 lg:py-6"
    >
      <div class="flex items-center justify-around lg:h-full lg:w-full lg:flex-col lg:items-center lg:gap-5">
        <A
          href="/provider"
          aria-label="Provider home"
          title="Provider home"
          class="hidden size-12 items-center justify-center rounded-2xl transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 lg:flex"
        >
          <img src="/logo_pack/emblem.svg" alt="" class="size-8 dark:hidden" />
          <img src="/logo_pack/emblem-on-dark.svg" alt="" class="hidden size-8 dark:block" />
        </A>
        <div class="flex flex-col items-center">
          <span class="hidden text-[9px] font-semibold uppercase tracking-widest text-dust-grey-300 lg:mb-2 lg:block">
            Provider
          </span>
          <A
            href="/provider"
            end
            aria-label="Provider overview"
            title="Provider overview"
            activeClass="bg-hunter-green-500 text-white shadow-sm"
            inactiveClass="text-dust-grey-300 hover:bg-dry-sage-900 hover:text-hunter-green-500"
            class="flex size-12 items-center justify-center rounded-2xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
          >
            <Store size={21} strokeWidth={1.8} aria-hidden="true" />
          </A>
        </div>
        <div class="hidden lg:mt-auto lg:block">
          <ThemeToggle />
        </div>
        <div class="lg:hidden">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
