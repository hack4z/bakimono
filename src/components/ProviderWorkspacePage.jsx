import { useLocation } from "@solidjs/router";
import { BarChart3, CreditCard, LayoutDashboard, UsersRound } from "lucide-solid";
import { Dynamic } from "solid-js/web";
import ProviderSignupBanner from "~/components/ProviderSignupBanner";

const sections = {
  members: {
    title: "Members",
    description: "Manage staff and partners associated with your provider business.",
    Icon: UsersRound,
  },
  analytics: {
    title: "Analytics",
    description: "Open Sales & performance or Reviews & feedback to view live provider data.",
    Icon: BarChart3,
  },
  payments: {
    title: "Payments",
    description: "Open Wallet to view confirmed M-PESA payments, or Payment records for transaction details.",
    Icon: CreditCard,
  },
  dashboard: {
    title: "Provider dashboard",
    description: "Your provider overview and day-to-day workspace will appear here.",
    Icon: LayoutDashboard,
  },
};

export default function ProviderWorkspacePage() {
  const location = useLocation();
  const section = () => sections[location.pathname.split("/").at(-1)] ?? sections.dashboard;

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-12 pt-7 text-dust-grey-100 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
      <div class="mx-auto max-w-5xl">
        <ProviderSignupBanner />
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Provider workspace</p>
        <h1 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">{section().title}</h1>
        <section class="mt-8 rounded-7 border border-dust-grey-600 bg-dry-sage-900 p-6 sm:p-8">
          <span class="flex size-12 items-center justify-center rounded-2xl bg-hunter-green-500 text-white">
            <Dynamic component={section().Icon} size={22} aria-hidden="true" />
          </span>
          <h2 class="mt-5 font-serif text-2xl">Choose a workspace section</h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-dust-grey-200">{section().description}</p>
        </section>
      </div>
    </main>
  );
}
