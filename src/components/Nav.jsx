import { A, useLocation } from "@solidjs/router";
import { createSignal, onCleanup, onMount } from "solid-js";
import { ArrowUpRight, Menu } from "lucide-solid";
import ThemeToggle from "~/components/ThemeToggle";
import { supabase } from "~/utils/supabase-client";

export default function Nav() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [isProvider, setIsProvider] = createSignal(false);
  const isProviderLanding = () => location.pathname === "/provider";

  onMount(() => {
    let active = true;
    let requestId = 0;

    async function checkProvider(userId) {
      const currentRequestId = ++requestId;
      if (!userId) {
        if (active) {
          setIsAuthenticated(false);
          setIsProvider(false);
        }
        return;
      }
      if (active) setIsAuthenticated(true);

      const { data, error } = await supabase
        .from("provider_members")
        .select("provider_id")
        .eq("member_id", userId)
        .maybeSingle();
      if (error) {
        console.error("Unable to check provider membership for navigation:", error);
        if (active && currentRequestId === requestId) setIsProvider(false);
        return;
      }
      if (active && currentRequestId === requestId) setIsProvider(Boolean(data?.provider_id));
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void checkProvider(session?.user?.id);
    });

    onCleanup(() => {
      active = false;
      subscription.unsubscribe();
    });
  });

  return (
    <header class="border-b border-dust-grey-700 bg-dust-grey-900">
      <nav

        class="mx-auto flex h-19 max-w-360 items-center justify-between px-5 sm:px-8 lg:px-12"
      >
        <A href="/" class="group flex items-center gap-3">
          <span>
            <img
              src="/logo_pack/logo-horizontal.svg"
              alt="Bakimono"
              class="h-8 w-auto dark:hidden sm:h-9"
            width="240" height="64" />
            <img
              src="/logo_pack/logo-horizontal-on-dark.svg"
              alt="Bakimono"
              class="hidden h-8 w-auto dark:block sm:h-9"
            width="240" height="64" />
            <span class="mt-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-dust-grey-text">
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
          <A href={isProviderLanding() ? "/" : "/provider"} class="text-sm font-medium text-dust-grey-200 transition hover:text-dust-grey-100">
            {isProviderLanding() ? "For clients" : "For providers"}
          </A>
        </div>

        <div class="flex items-center gap-3">
          <ThemeToggle />
          {isProvider() ? (
            <A
              href="/provider/dashboard/orders-bookings"
              class="hidden items-center gap-1.5 rounded-full bg-hunter-green-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-hunter-green-400 sm:inline-flex"
            >
              Dashboard
            </A>
          ) : isAuthenticated() ? (
            <A
              href="/dashboard"
              class="hidden items-center gap-1.5 rounded-full bg-hunter-green-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-hunter-green-400 sm:inline-flex"
            >
              Dashboard
            </A>
          ) : (
            <>
              <A
                href="/login"
                class="hidden text-sm font-medium text-hunter-green-500 transition hover:text-fern-text sm:inline"
              >
                Log in
              </A>
              <A
                href="/signup"
                class="hidden items-center gap-1.5 rounded-full bg-hunter-green-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-hunter-green-400 sm:inline-flex"
              >
                Sign up <ArrowUpRight size={15} aria-hidden="true" />
              </A>
            </>
          )}
          <details class="relative md:hidden">
            <summary

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
              <A href={isProviderLanding() ? "/" : "/provider"} class="rounded-xl px-3 py-2.5 text-sm font-medium text-dust-grey-200 hover:bg-dust-grey-800">
                {isProviderLanding() ? "For clients" : "For providers"}
              </A>
              {isAuthenticated() && (
                <A href={isProvider() ? "/provider/dashboard/orders-bookings" : "/dashboard"} class="rounded-xl px-3 py-2.5 text-sm font-semibold text-hunter-green-500 hover:bg-dust-grey-800">
                  Dashboard
                </A>
              )}
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
}
