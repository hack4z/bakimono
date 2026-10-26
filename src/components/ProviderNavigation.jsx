import { A } from "@solidjs/router";
import { BarChart3, CreditCard, LayoutDashboard, Settings, UsersRound } from "lucide-solid";
import { For } from "solid-js";
import ThemeToggle from "~/components/ThemeToggle";

const providerLinks = [
  { href: "/provider/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/provider/associates", label: "Associates", Icon: UsersRound },
  { href: "/provider/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/provider/payments", label: "Payments", Icon: CreditCard },
  { href: "/provider/settings", label: "Settings", Icon: Settings },
];

export default function ProviderNavigation() {
  return (
    <nav
      aria-label="Provider navigation"
      class="provider-sidebar fixed inset-x-0 bottom-0 z-50 border-t border-dust-grey-600 bg-dust-grey-900/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-lg lg:inset-y-0 lg:left-0 lg:right-auto lg:flex lg:flex-col lg:items-stretch lg:border-r lg:border-t-0 lg:px-1 lg:py-6"
    >
      <div class="provider-sidebar-content flex items-center justify-around lg:h-full lg:w-full lg:flex-col lg:items-stretch lg:justify-start lg:gap-5">
        <A
          href="/provider/dashboard"
          aria-label="Provider dashboard"
          title="Provider dashboard"
          class="provider-sidebar-brand hidden h-12 items-center justify-center gap-3 rounded-2xl transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 lg:flex"
        >
          <img src="/logo_pack/emblem.svg" alt="" class="size-8 shrink-0 dark:hidden" />
          <img src="/logo_pack/emblem-on-dark.svg" alt="" class="hidden size-8 shrink-0 dark:block" />
          <span class="provider-sidebar-label whitespace-nowrap text-sm font-semibold text-dust-grey-100">
            Provider
          </span>
        </A>

        <section
          aria-label="Provider pages"
          class="flex items-center justify-around gap-1 lg:w-full lg:flex-col lg:items-stretch lg:justify-start lg:gap-2"
        >
          <h2 class="sr-only">Provider pages</h2>
          <For each={providerLinks}>
            {(link) => (
              <A
                href={link.href}
                aria-label={link.label}
                title={link.label}
                activeClass="bg-hunter-green-500 text-white shadow-sm"
                inactiveClass="text-dust-grey-300 hover:bg-dry-sage-900 hover:text-hunter-green-500"
                class="provider-sidebar-link flex h-12 w-12 shrink-0 items-center justify-center gap-3 overflow-hidden rounded-2xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 lg:w-full"
              >
                <link.Icon size={21} strokeWidth={1.8} aria-hidden="true" />
                <span class="provider-sidebar-label whitespace-nowrap text-sm font-medium">
                  {link.label}
                </span>
              </A>
            )}
          </For>
        </section>

        <div class="provider-sidebar-theme lg:mt-auto">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
