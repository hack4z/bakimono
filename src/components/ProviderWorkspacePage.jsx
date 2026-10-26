import { useLocation } from "@solidjs/router";
import { BarChart3, CreditCard, LayoutDashboard, Settings, UsersRound } from "lucide-solid";
import { Dynamic } from "solid-js/web";

const sections = {
  dashboard: {
    title: "Provider dashboard",
    description: "Your provider overview and day-to-day workspace will appear here.",
    Icon: LayoutDashboard,
  },
  associates: {
    title: "Associates",
    description: "Manage the people who help run your provider account.",
    Icon: UsersRound,
  },
  analytics: {
    title: "Analytics",
    description: "Review activity and performance insights for your business.",
    Icon: BarChart3,
  },
  payments: {
    title: "Payments",
    description: "View and manage your provider payment information.",
    Icon: CreditCard,
  },
  settings: {
    title: "Provider settings",
    description: "Manage your provider profile and workspace preferences.",
    Icon: Settings,
  },
};

export default function ProviderWorkspacePage() {
  const location = useLocation();
  const section = () => sections[location.pathname.split("/").at(-1)] ?? sections.dashboard;

  return (
    <main class="min-h-screen bg-dust-grey-900 px-5 py-10 text-dust-grey-100 sm:px-8 lg:px-12">
      <div class="mx-auto max-w-5xl">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-500">Provider workspace</p>
        <h1 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">{section().title}</h1>
        <section class="mt-8 rounded-[28px] border border-dust-grey-600 bg-dry-sage-900 p-6 sm:p-8">
          <span class="flex size-12 items-center justify-center rounded-2xl bg-hunter-green-500 text-white">
            <Dynamic component={section().Icon} size={22} aria-hidden="true" />
          </span>
          <h2 class="mt-5 font-serif text-2xl">This section is coming soon</h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-dust-grey-200">{section().description}</p>
        </section>
      </div>
    </main>
  );
}
