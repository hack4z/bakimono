import { A, useLocation } from "@solidjs/router";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  CreditCard,
  CircleHelp,
  FileText,
  Handshake,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  ReceiptText,
  Shield,
  Settings,
  Store,
  TrendingUp,
  UsersRound,
  Wallet,
  QrCode,
  X,
} from "lucide-solid";
import { createSignal, For, onMount, Show } from "solid-js";
import { supabase } from "~/utils/supabase-client";

const providerLinks = [
  { href: "/provider/dashboard/orders-bookings", label: "Orders & bookings", Icon: ClipboardList },
  { href: "/provider/dashboard/inventory", label: "Inventory", Icon: Boxes },
  { href: "/provider/dashboard/calendar", label: "Calendar", Icon: CalendarDays },
];
const settingsLinks = [
  { href: "/provider/settings/preferences", label: "Preferences", Icon: Settings },
  { href: "/provider/settings/qr-code", label: "QR Code", Icon: QrCode },
  { href: "/provider/settings/terms-and-conditions", label: "Terms & Conditions", Icon: FileText },
  { href: "/provider/settings/privacy-policy", label: "Privacy Policy", Icon: Shield },
  { href: "/provider/settings/help", label: "Help", Icon: CircleHelp },
];
const memberLinks = [
  { href: "/provider/members/staff", label: "Staff", Icon: UsersRound },
  { href: "/provider/members/partners", label: "Partners", Icon: Handshake },
  { href: "/provider/members/invitations", label: "Invitations", Icon: Mail },
];
const paymentLinks = [
  { href: "/provider/payments/wallet", label: "Wallet", Icon: Wallet },
  { href: "/provider/payments/records", label: "Records", Icon: ReceiptText },
];
const analyticsLinks = [
  { href: "/provider/analytics/storefront", label: "Storefront", Icon: Store },
  { href: "/provider/analytics/sales-performance", label: "Sales & performance", Icon: TrendingUp },
  { href: "/provider/analytics/reviews-feedback", label: "Reviews & feedback", Icon: MessageSquareText },
];
const sidebarLabelClasses =
  "whitespace-nowrap text-sm font-medium transition-[max-width,opacity] duration-200 lg:block lg:max-w-0 lg:overflow-hidden lg:opacity-0 lg:group-hover/sidebar:max-w-40 lg:group-hover/sidebar:opacity-100 lg:group-has-[:focus-visible]/sidebar:max-w-40 lg:group-has-[:focus-visible]/sidebar:opacity-100 motion-reduce:transition-none";
const subnavClasses = (isOpen) =>
  `gap-1.5 rounded-2xl p-2 lg:gap-1.5 ${
    isOpen
      ? "absolute bottom-[calc(100%+0.5rem)] left-0 z-[1] grid w-[min(19rem,calc(100vw-2rem))] border border-dust-grey-600 bg-dust-grey-900 shadow-[0_16px_30px_rgba(0,0,0,0.16)] lg:static lg:mt-1.5 lg:mr-0 lg:mb-1 lg:ml-3 lg:w-auto lg:border-0 lg:border-l lg:border-dust-grey-600 lg:bg-transparent lg:p-0 lg:pl-2.5 lg:shadow-none lg:hidden lg:group-hover/sidebar:grid lg:group-has-[:focus-visible]/sidebar:grid"
      : "hidden"
  }`;
const childLinkClasses =
  "flex h-10 w-full items-center justify-start gap-3 overflow-hidden rounded-xl border-l-2 border-dry-sage-600 bg-dust-grey-800 px-3 text-left transition hover:border-l-hunter-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 aria-[current=page]:border-l-hunter-green-500 aria-[current=page]:bg-hunter-green-500 aria-[current=page]:text-white aria-[current=page]:shadow-sm lg:border-l-0 lg:bg-transparent lg:px-2.5 lg:text-[13px] lg:hover:bg-dry-sage-900 lg:aria-[current=page]:bg-hunter-green-500";

export default function ProviderNavigation() {
  const location = useLocation();
  const [canManageMembers, setCanManageMembers] = createSignal(false);
  const [canViewPartners, setCanViewPartners] = createSignal(false);
  const [canViewFinancials, setCanViewFinancials] = createSignal(false);
  const [canViewWallet, setCanViewWallet] = createSignal(false);
  const [dashboardOpen, setDashboardOpen] = createSignal(location.pathname.startsWith("/provider/dashboard"));
  const [membersOpen, setMembersOpen] = createSignal(location.pathname.startsWith("/provider/members"));
  const [paymentsOpen, setPaymentsOpen] = createSignal(location.pathname.startsWith("/provider/payments"));
  const [analyticsOpen, setAnalyticsOpen] = createSignal(location.pathname.startsWith("/provider/analytics"));
  const [settingsOpen, setSettingsOpen] = createSignal(location.pathname.startsWith("/provider/settings"));
  const [mobileMenu, setMobileMenu] = createSignal(null);
  const dashboardActive = () => location.pathname.startsWith("/provider/dashboard");
  const membersActive = () => location.pathname.startsWith("/provider/members");
  const paymentsActive = () => location.pathname.startsWith("/provider/payments");
  const analyticsActive = () => location.pathname.startsWith("/provider/analytics");
  const settingsActive = () => location.pathname.startsWith("/provider/settings");
  const openMobileMenu = (section) => {
    setMobileMenu((current) => current === section ? null : section);
  };
  const mobileMenuLinks = () => {
    if (mobileMenu() === "dashboard") return providerLinks;
    if (mobileMenu() === "analytics") return analyticsLinks.filter((link) =>
      link.href !== "/provider/analytics/sales-performance" || canViewFinancials(),
    );
    if (mobileMenu() === "members") return memberLinks.filter((link) =>
      link.href !== "/provider/members/partners" || canViewPartners(),
    );
    if (mobileMenu() === "payments") return paymentLinks.filter((link) =>
      (link.href !== "/provider/payments/records" || canViewFinancials())
      && (link.href !== "/provider/payments/wallet" || canViewWallet()),
    );
    return settingsLinks;
  };
  const mobileMenuTitle = () => ({
    dashboard: "Dashboard",
    analytics: "Analytics",
    members: "Members",
    payments: "Payments",
    settings: "Settings",
  })[mobileMenu()] ?? "More";

  onMount(async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) return;
      const { data: memberships, error } = await supabase
        .from("provider_members")
        .select("role")
        .eq("member_id", authData.user.id);
      if (error) return;
      const membership = memberships?.[0];
      const role = membership?.role?.trim().toLowerCase();
      setCanManageMembers(["owner", "manager"].includes(role));
      setCanViewPartners(role === "owner");
      setCanViewFinancials(["owner", "manager", "accountant"].includes(role));
      setCanViewWallet(role === "owner");
    } catch {
      setCanManageMembers(false);
      setCanViewPartners(false);
      setCanViewFinancials(false);
      setCanViewWallet(false);
    }
  });

  return (
    <nav

      class="group/sidebar fixed inset-x-0 bottom-0 z-50 border-t border-dust-grey-600 bg-dust-grey-900/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-lg motion-reduce:transition-none lg:inset-y-0 lg:left-0 lg:right-auto lg:flex lg:w-[4.5rem] lg:flex-col lg:items-stretch lg:overflow-x-hidden lg:border-r lg:border-t-0 lg:px-1 lg:py-6 lg:transition-[width] lg:duration-200 lg:hover:w-64 lg:hover:overflow-x-visible lg:hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] lg:has-[:focus-visible]:w-64 lg:has-[:focus-visible]:overflow-x-visible lg:has-[:focus-visible]:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]"
    >
      <div class="flex items-center justify-around lg:h-full lg:w-full lg:flex-col lg:items-stretch lg:justify-start lg:gap-5">
        <A
          href="/provider"

          title="Provider dashboard"
          class="hidden h-12 items-center justify-center gap-3 rounded-2xl transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 lg:flex lg:px-0 lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:px-3 lg:group-has-[:focus-visible]/sidebar:justify-start lg:group-has-[:focus-visible]/sidebar:px-3"
        >
          <img src="/logo_pack/emblem.svg" alt="" class="size-8 shrink-0 dark:hidden" width="64" height="64" />
          <img src="/logo_pack/emblem-on-dark.svg" alt="" class="hidden size-8 shrink-0 dark:block" width="64" height="64" />
          <span class={`hidden ${sidebarLabelClasses} font-semibold text-dust-grey-100`}>
            Provider

          </span>
        </A>

        <Show when={mobileMenu()}>
          <section
            class="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-[60] max-h-[65dvh] overflow-y-auto rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-3 shadow-2xl lg:hidden"
          >
            <div class="mb-2 flex items-center justify-between px-1">
              <h2 class="font-serif text-lg font-semibold text-dust-grey-100">{mobileMenuTitle()}</h2>
              <button
                type="button"
                title="Close menu"
                onClick={() => setMobileMenu(null)}
                class="flex size-9 items-center justify-center rounded-full bg-dry-sage-900 text-dust-grey-200"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div class="grid gap-2">
              <For each={mobileMenuLinks()}>
                {(link) => (
                  <A
                    href={link.href}
                    onClick={() => setMobileMenu(null)}
                    activeClass="bg-hunter-green-500 text-white"
                    inactiveClass="bg-dust-grey-800 text-dust-grey-100 hover:bg-dry-sage-900"
                    class="flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold"
                  >
                    <link.Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                    <span>{link.label}</span>
                  </A>
                )}
              </For>
            </div>
          </section>
        </Show>

        <section class="flex w-full items-center justify-around gap-1 lg:hidden">
          <button
            type="button"
            onClick={() => openMobileMenu("dashboard")}
            title="Dashboard"
            class={`flex size-12 items-center justify-center rounded-2xl ${dashboardActive() ? "bg-hunter-green-500 text-white" : "text-dust-grey-text"}`}
          >
            <LayoutDashboard size={21} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => openMobileMenu("analytics")}
            title="Analytics"
            class={`flex size-12 items-center justify-center rounded-2xl ${analyticsActive() ? "bg-hunter-green-500 text-white" : "text-dust-grey-text"}`}
          >
            <BarChart3 size={21} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => openMobileMenu("members")}
            title="Members"
            class={`flex size-12 items-center justify-center rounded-2xl ${membersActive() ? "bg-hunter-green-500 text-white" : "text-dust-grey-text"}`}
          >
            <UsersRound size={21} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => openMobileMenu("payments")}
            title="Payments"
            class={`flex size-12 items-center justify-center rounded-2xl ${paymentsActive() ? "bg-hunter-green-500 text-white" : "text-dust-grey-text"}`}
          >
            <CreditCard size={21} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => openMobileMenu("settings")}
            title="Settings"
            class={`flex size-12 items-center justify-center rounded-2xl ${settingsActive() ? "bg-hunter-green-500 text-white" : "text-dust-grey-text"}`}
          >
            <Settings size={21} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </section>

        <section

          class="hidden items-center justify-around gap-1 lg:flex lg:w-full lg:flex-col lg:items-stretch lg:justify-start lg:gap-2"
        >
          <h2 class="sr-only">Provider pages</h2>
          <div class="relative lg:w-12 lg:self-center lg:group-hover/sidebar:w-full lg:group-hover/sidebar:self-stretch lg:group-has-[:focus-visible]/sidebar:w-full lg:group-has-[:focus-visible]/sidebar:self-stretch">
            <button
              type="button"
              aria-expanded={settingsOpen()}
              aria-controls="provider-settings-links"
              onClick={() => setSettingsOpen((open) => !open)}
              class="relative flex h-12 w-12 shrink-0 items-center justify-center gap-3 overflow-hidden rounded-2xl px-0 text-dust-grey-text transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 lg:w-12 lg:self-center lg:group-hover/sidebar:w-full lg:group-hover/sidebar:self-stretch lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:px-3 lg:group-has-[:focus-visible]/sidebar:w-full lg:group-has-[:focus-visible]/sidebar:self-stretch lg:group-has-[:focus-visible]/sidebar:justify-start lg:group-has-[:focus-visible]/sidebar:px-3"
            >
              <Settings size={21} strokeWidth={1.8} aria-hidden="true" />
              <span class={`hidden ${sidebarLabelClasses} ${settingsActive() ? "text-hunter-green-500" : ""}`}>Settings</span>
              <ChevronDown
                class={`hidden size-3 shrink-0 transition-transform lg:static lg:hidden lg:ml-auto lg:size-4 lg:group-hover/sidebar:block lg:group-has-[:focus-visible]/sidebar:block ${settingsOpen() ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            <div
              id="provider-settings-links"
              class={subnavClasses(settingsOpen())}

            >
              <For each={settingsLinks}>
                {(link) => (
                  <A
                    href={link.href}

                    title={link.label}
                    activeClass="bg-hunter-green-500 text-white shadow-sm"
                    inactiveClass="text-dust-grey-text hover:bg-dry-sage-900 hover:text-hunter-green-500"
                    class={childLinkClasses}
                  >
                    <link.Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    <span class={`${sidebarLabelClasses} ${settingsOpen() ? "block max-w-40 opacity-100" : "hidden"}`}>{link.label}</span>
                  </A>
                )}
              </For>
            </div>
          </div>

          <div class="relative lg:w-12 lg:self-center lg:group-hover/sidebar:w-full lg:group-hover/sidebar:self-stretch lg:group-has-[:focus-visible]/sidebar:w-full lg:group-has-[:focus-visible]/sidebar:self-stretch">
            <button
              type="button"
              aria-expanded={dashboardOpen()}
              aria-controls="provider-dashboard-links"
              onClick={() => setDashboardOpen((open) => !open)}
              class="relative flex h-12 w-12 shrink-0 items-center justify-center gap-3 overflow-hidden rounded-2xl px-0 text-dust-grey-text transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 lg:w-12 lg:self-center lg:group-hover/sidebar:w-full lg:group-hover/sidebar:self-stretch lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:px-3 lg:group-has-[:focus-visible]/sidebar:w-full lg:group-has-[:focus-visible]/sidebar:self-stretch lg:group-has-[:focus-visible]/sidebar:justify-start lg:group-has-[:focus-visible]/sidebar:px-3"
            >
              <LayoutDashboard size={21} strokeWidth={1.8} aria-hidden="true" />
              <span class={`hidden ${sidebarLabelClasses} ${dashboardActive() ? "text-pine-teal-500" : ""}`}>Dashboard</span>
              <ChevronDown
                class={`hidden size-3 shrink-0 transition-transform lg:static lg:hidden lg:ml-auto lg:size-4 lg:group-hover/sidebar:block lg:group-has-[:focus-visible]/sidebar:block ${dashboardOpen() ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            <div
              id="provider-dashboard-links"
              class={subnavClasses(dashboardOpen())}

            >
              <For each={providerLinks.slice(0, 3)}>
                {(link) => (
                  <A
                    href={link.href}

                    title={link.label}
                    activeClass="bg-hunter-green-500 text-white shadow-sm"
                    inactiveClass="text-dust-grey-text hover:bg-dry-sage-900 hover:text-hunter-green-500"
                    class={childLinkClasses}
                  >
                    <link.Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    <span class={`${sidebarLabelClasses} ${dashboardOpen() ? "block max-w-40 opacity-100" : "hidden"}`}>{link.label}</span>
                  </A>
                )}
              </For>
            </div>
          </div>

          <div class="relative lg:w-12 lg:self-center lg:group-hover/sidebar:w-full lg:group-hover/sidebar:self-stretch lg:group-has-[:focus-visible]/sidebar:w-full lg:group-has-[:focus-visible]/sidebar:self-stretch">
            <button
              type="button"
              aria-expanded={analyticsOpen()}
              aria-controls="provider-analytics-links"
              onClick={() => setAnalyticsOpen((open) => !open)}
              class="relative flex h-12 w-12 shrink-0 items-center justify-center gap-3 overflow-hidden rounded-2xl px-0 text-dust-grey-text transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 lg:w-12 lg:self-center lg:group-hover/sidebar:w-full lg:group-hover/sidebar:self-stretch lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:px-3 lg:group-has-[:focus-visible]/sidebar:w-full lg:group-has-[:focus-visible]/sidebar:self-stretch lg:group-has-[:focus-visible]/sidebar:justify-start lg:group-has-[:focus-visible]/sidebar:px-3"
            >
              <BarChart3 size={21} strokeWidth={1.8} aria-hidden="true" />
              <span class={`hidden ${sidebarLabelClasses} ${analyticsActive() ? "text-hunter-green-500" : ""}`}>Analytics</span>
              <ChevronDown
                class={`hidden size-3 shrink-0 transition-transform lg:static lg:hidden lg:ml-auto lg:size-4 lg:group-hover/sidebar:block lg:group-has-[:focus-visible]/sidebar:block ${analyticsOpen() ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            <div
              id="provider-analytics-links"
              class={subnavClasses(analyticsOpen())}

            >
              <For each={analyticsLinks.filter((link) =>
                link.href !== "/provider/analytics/sales-performance" || canViewFinancials(),
              )}>
                {(link) => (
                  <A
                    href={link.href}

                    title={link.label}
                    activeClass="bg-hunter-green-500 text-white shadow-sm"
                    inactiveClass="text-dust-grey-text hover:bg-dry-sage-900 hover:text-hunter-green-500"
                    class={childLinkClasses}
                  >
                    <link.Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    <span class={`${sidebarLabelClasses} ${analyticsOpen() ? "block max-w-40 opacity-100" : "hidden"}`}>{link.label}</span>
                  </A>
                )}
              </For>
            </div>
          </div>

          <Show when={canManageMembers()}>
          <div class="relative lg:w-12 lg:self-center lg:group-hover/sidebar:w-full lg:group-hover/sidebar:self-stretch lg:group-has-[:focus-visible]/sidebar:w-full lg:group-has-[:focus-visible]/sidebar:self-stretch">
            <button
              type="button"
              aria-expanded={membersOpen()}
              aria-controls="provider-member-links"
              onClick={() => setMembersOpen((open) => !open)}
              class="relative flex h-12 w-12 shrink-0 items-center justify-center gap-3 overflow-hidden rounded-2xl px-0 text-dust-grey-text transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 lg:w-12 lg:self-center lg:group-hover/sidebar:w-full lg:group-hover/sidebar:self-stretch lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:px-3 lg:group-has-[:focus-visible]/sidebar:w-full lg:group-has-[:focus-visible]/sidebar:self-stretch lg:group-has-[:focus-visible]/sidebar:justify-start lg:group-has-[:focus-visible]/sidebar:px-3"
            >
              <UsersRound size={21} strokeWidth={1.8} aria-hidden="true" />
              <span class={`hidden ${sidebarLabelClasses} ${membersActive() ? "text-hunter-green-500" : ""}`}>Members</span>
              <ChevronDown
                class={`hidden size-3 shrink-0 transition-transform lg:static lg:hidden lg:ml-auto lg:size-4 lg:group-hover/sidebar:block lg:group-has-[:focus-visible]/sidebar:block ${membersOpen() ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            <div id="provider-member-links" class={subnavClasses(membersOpen())}>
              <For each={memberLinks.filter((link) =>
                link.href !== "/provider/members/partners" || canViewPartners(),
              )}>
                {(link) => (
                  <A
                    href={link.href}

                    title={link.label}
                    activeClass="bg-hunter-green-500 text-white shadow-sm"
                    inactiveClass="text-dust-grey-text hover:bg-dry-sage-900 hover:text-hunter-green-500"
                    class={childLinkClasses}
                  >
                    <link.Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    <span class={`${sidebarLabelClasses} ${membersOpen() ? "block max-w-40 opacity-100" : "hidden"}`}>{link.label}</span>
                  </A>
                )}
              </For>
            </div>
          </div>
          </Show>

          <div class="relative lg:w-12 lg:self-center lg:group-hover/sidebar:w-full lg:group-hover/sidebar:self-stretch lg:group-has-[:focus-visible]/sidebar:w-full lg:group-has-[:focus-visible]/sidebar:self-stretch">
            <button
              type="button"
              aria-expanded={paymentsOpen()}
              aria-controls="provider-payment-links"
              onClick={() => setPaymentsOpen((open) => !open)}
              class="relative flex h-12 w-12 shrink-0 items-center justify-center gap-3 overflow-hidden rounded-2xl px-0 text-dust-grey-text transition hover:bg-dry-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 lg:w-12 lg:self-center lg:group-hover/sidebar:w-full lg:group-hover/sidebar:self-stretch lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:px-3 lg:group-has-[:focus-visible]/sidebar:w-full lg:group-has-[:focus-visible]/sidebar:self-stretch lg:group-has-[:focus-visible]/sidebar:justify-start lg:group-has-[:focus-visible]/sidebar:px-3"
            >
              <CreditCard size={21} strokeWidth={1.8} aria-hidden="true" />
              <span class={`hidden ${sidebarLabelClasses} ${paymentsActive() ? "text-hunter-green-500" : ""}`}>Payments</span>
              <ChevronDown
                class={`hidden size-3 shrink-0 transition-transform lg:static lg:hidden lg:ml-auto lg:size-4 lg:group-hover/sidebar:block lg:group-has-[:focus-visible]/sidebar:block ${paymentsOpen() ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            <div
              id="provider-payment-links"
              class={subnavClasses(paymentsOpen())}

            >
              <For each={paymentLinks.filter((link) =>
                (link.href !== "/provider/payments/records" || canViewFinancials())
                && (link.href !== "/provider/payments/wallet" || canViewWallet()),
              )}>
                {(link) => (
                  <A
                    href={link.href}

                    title={link.label}
                    activeClass="bg-hunter-green-500 text-white shadow-sm"
                    inactiveClass="text-dust-grey-text hover:bg-dry-sage-900 hover:text-hunter-green-500"
                    class={childLinkClasses}
                  >
                    <link.Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    <span class={`${sidebarLabelClasses} ${paymentsOpen() ? "block max-w-40 opacity-100" : "hidden"}`}>{link.label}</span>
                  </A>
                )}
              </For>
            </div>
          </div>

        </section>

      </div>
    </nav>
  );
}
