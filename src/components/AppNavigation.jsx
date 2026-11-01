import { A } from "@solidjs/router";
import { CalendarDays, Compass, LayoutDashboard, Settings } from "lucide-solid";

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

      title={props.label}
      activeClass="bg-hunter-green-500 text-white shadow-sm"
      inactiveClass="text-dust-grey-text hover:bg-dry-sage-900 hover:text-hunter-green-500"
      class="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 lg:size-12 lg:min-h-12 lg:flex-none lg:flex-col lg:text-xs"
    >
      <props.Icon size={21} strokeWidth={1.8} aria-hidden="true" />
      <span class="max-w-full truncate lg:hidden">{props.label}</span>
    </A>
  );
}

export default function AppNavigation() {
  return (
    <nav

      class="fixed inset-x-0 bottom-0 z-50 border-t border-dust-grey-600 bg-dust-grey-900/95 px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1.5 backdrop-blur-lg lg:inset-y-0 lg:left-0 lg:right-auto lg:flex lg:w-22 lg:flex-col lg:items-center lg:border-r lg:border-t-0 lg:px-3 lg:py-6"
    >
      <div class="flex items-center gap-1 lg:h-full lg:w-full lg:flex-col lg:items-stretch lg:justify-start lg:gap-5">
        <A
          href="/"

          title="Bakimono home"
          class="hidden size-12 items-center justify-center rounded-2xl transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 lg:flex"
        >
          <img src="/logo_pack/emblem.svg" alt="" class="size-8 dark:hidden" width="64" height="64" />
          <img src="/logo_pack/emblem-on-dark.svg" alt="" class="hidden size-8 dark:block" width="64" height="64" />
        </A>
        <section class="flex min-w-0 flex-1 items-center gap-1 lg:w-full lg:flex-col lg:items-center lg:gap-2">
          <h2 class="sr-only lg:not-sr-only lg:mb-1 lg:text-[9px] lg:font-semibold lg:uppercase lg:tracking-widest lg:text-dust-grey-text">
            Client
          </h2>
          {clientLinks.map((link) => <NavigationLink {...link} />)}
        </section>
      </div>
    </nav>
  );
}
