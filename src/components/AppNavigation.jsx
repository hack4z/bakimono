import { A } from "@solidjs/router";
import { CalendarDays, Compass, LayoutDashboard, Settings } from "lucide-solid";
import ThemeToggle from "~/components/ThemeToggle";

const clientLinks = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { href: "/explore", label: "Explore", Icon: Compass },
  { href: "/bookings", label: "Bookings", Icon: CalendarDays },
  { href: "/settings", label: "Settings", Icon: Settings },
];
function NavigationLink(props) {
  return (
    <A
      href={props.href}
      end={props.end}
      aria-label={props.label}
      title={props.label}
      activeClass="bg-hunter-green-500 text-white shadow-sm"
      inactiveClass="text-dust-grey-300 hover:bg-dry-sage-900 hover:text-hunter-green-500"
      class="flex size-12 items-center justify-center rounded-2xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
    >
      <props.Icon size={21} strokeWidth={1.8} aria-hidden="true" />
    </A>
  );
}

export default function AppNavigation() {
  return (
    <nav
      aria-label="App navigation"
      class="fixed inset-x-0 bottom-0 z-50 border-t border-dust-grey-600 bg-dust-grey-900/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-lg lg:inset-y-0 lg:left-0 lg:right-auto lg:flex lg:w-[88px] lg:flex-col lg:items-center lg:border-r lg:border-t-0 lg:px-3 lg:py-6"
    >
      <div class="flex items-center justify-around lg:h-full lg:w-full lg:flex-col lg:items-stretch lg:justify-start lg:gap-5">
        <A
          href="/"
          aria-label="Bakimono home"
          title="Bakimono home"
          class="hidden size-12 items-center justify-center rounded-2xl transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 lg:flex"
        >
          <img src="/logo_pack/emblem.svg" alt="" class="size-8 dark:hidden" />
          <img src="/logo_pack/emblem-on-dark.svg" alt="" class="hidden size-8 dark:block" />
        </A>
        <section aria-label="Client pages" class="flex items-center justify-around gap-1 lg:w-full lg:flex-col lg:items-center lg:gap-2">
          <h2 class="sr-only lg:not-sr-only lg:mb-1 lg:text-[9px] lg:font-semibold lg:uppercase lg:tracking-widest lg:text-dust-grey-300">
            Client
          </h2>
          {clientLinks.map((link) => <NavigationLink {...link} />)}
        </section>
        <div class="hidden lg:mt-auto lg:block">
          <ThemeToggle />
        </div>
        <div class="lg:hidden"><ThemeToggle /></div>
      </div>
    </nav>
  );
}
