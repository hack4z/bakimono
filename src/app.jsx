import { A, Navigate, Route, Router, useLocation } from "@solidjs/router";
import { createSignal, lazy, onMount, Show, Suspense } from "solid-js";
import { Dynamic } from "solid-js/web";
import Nav from "~/components/Nav";
import AppNavigation from "~/components/AppNavigation";
import ProviderNavigation from "~/components/ProviderNavigation";
import { getCurrentProviderOnboardingStep } from "~/utils/provider-onboarding";
import { supabase } from "~/utils/supabase-client";
import "./app.css";

const BookingsPage = lazy(() => import("~/components/BookingsPage"));
const CheckoutPage = lazy(() => import("~/components/CheckoutPage"));
const DashboardPage = lazy(() => import("~/components/DashboardPage"));
const ExplorePage = lazy(() => import("~/components/ExplorePage"));
const HomePage = lazy(() => import("~/components/HomePage"));
const HelpPage = lazy(() => import("~/components/HelpPage"));
const LoginPage = lazy(() => import("~/components/LoginPage"));
const PasswordRecoveryPage = lazy(() => import("~/components/PasswordRecoveryPage"));
const ProviderPage = lazy(() => import("~/components/ProviderPage"));
const ProviderAccountSignupPage = lazy(() => import("~/components/ProviderAccountSignupPage"));
const ProviderLoginPage = lazy(() => import("~/components/ProviderLoginPage"));
const ProviderPartnerSignupPage = lazy(() => import("~/components/ProviderPartnerSignupPage"));
const ProviderMemberSignupPage = lazy(() => import("~/components/ProviderMemberSignupPage"));
const ProviderDashboardPage = lazy(() => import("~/components/ProviderDashboardPage"));
const ProviderCalendarPage = lazy(() => import("~/components/ProviderCalendarPage"));
const ProviderInventoryPage = lazy(() => import("~/components/ProviderInventoryPage"));
const ProviderGalleryPage = lazy(() => import("~/components/ProviderGalleryPage"));
const ProviderPaymentPage = lazy(() => import("~/components/ProviderPaymentPage"));
const ProviderSignupPage = lazy(() => import("~/components/ProviderSignupPage"));
const ProviderSocialLinksPage = lazy(() => import("~/components/ProviderSocialLinksPage"));
const ProviderVerificationPage = lazy(() => import("~/components/ProviderVerificationPage"));
const ProviderPaymentRecordsPage = lazy(() => import("~/components/ProviderPaymentRecordsPage"));
const ProviderPartnersPage = lazy(() => import("~/components/ProviderPartnersPage"));
const ProviderStaffPage = lazy(() => import("~/components/ProviderStaffPage"));
const ProviderInvitationsPage = lazy(() => import("~/components/ProviderInvitationsPage"));
const ProviderAnalyticsPage = lazy(() => import("~/components/ProviderAnalyticsPage"));
const ProviderReviewsPage = lazy(() => import("~/components/ProviderReviewsPage"));
const ProviderStorefrontPage = lazy(() => import("~/components/ProviderStorefrontPage"));
const ProviderWalletPage = lazy(() => import("~/components/ProviderWalletPage"));
const ProviderWorkspacePage = lazy(() => import("~/components/ProviderWorkspacePage"));
const SignupPage = lazy(() => import("~/components/SignupPage"));
const SettingsPage = lazy(() => import("~/components/SettingsPage"));
const ProviderSettingsPage = lazy(() =>
  import("~/components/SettingsPage").then((module) => ({ default: module.ProviderSettingsPage }))
);
const ProviderSettingsPreferencesPage = lazy(() =>
  import("~/components/SettingsPage").then((module) => ({ default: module.ProviderSettingsPreferencesPage }))
);
const ProviderSettingsQrCodePage = lazy(() =>
  import("~/components/SettingsPage").then((module) => ({ default: module.ProviderSettingsQrCodePage }))
);
const SettingsInfoPage = lazy(() =>
  import("~/components/SettingsPage").then((module) => ({ default: module.SettingsInfoPage }))
);

const guardedProviderPage = (component, options = {}) => () => (
  <ProviderAccessGuard
    component={component}
    managedSection={options.managedSection}
    allowedRoles={options.allowedRoles}
    accessTitle={options.accessTitle}
    accessDescription={options.accessDescription}
  />
);

const withMainNavigation = (Page) => function MainNavigationPage() {
  return (
    <>
      <Nav />
      <Page />
    </>
  );
};

export default function App() {
  return (
    <Router
      root={props => <AppShell>{props.children}</AppShell>}
    >
      <Route path="/" component={withMainNavigation(HomePage)} />
      <Route path="/login" component={withMainNavigation(LoginPage)} />
      <Route path="/forgot-password" component={withMainNavigation(PasswordRecoveryPage)} />
      <Route path="/reset-password" component={withMainNavigation(PasswordRecoveryPage)} />
      <Route path="/signup" component={withMainNavigation(SignupPage)} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/explore" component={ExplorePage} />
      <Route path="/bookings" component={BookingsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/help" component={HelpPage} />
      <Route path="/provider" component={withMainNavigation(ProviderPage)} />
      <Route path="/provider/dashboard" component={guardedProviderPage(ProviderDashboardPage)} />
      <Route path="/provider/dashboard/orders-bookings" component={guardedProviderPage(ProviderDashboardPage)} />
      <Route path="/provider/dashboard/inventory" component={guardedProviderPage(ProviderInventoryPage)} />
      <Route path="/provider/dashboard/calendar" component={guardedProviderPage(ProviderCalendarPage)} />
      <Route path="/provider/members" component={guardedProviderPage(ProviderWorkspacePage, { managedSection: true })} />
      <Route path="/provider/members/staff" component={guardedProviderPage(ProviderStaffPage, { managedSection: true })} />
      <Route path="/provider/members/partners" component={guardedProviderPage(ProviderPartnersPage, {
        allowedRoles: ["owner"],
        accessTitle: "Partners access restricted",
        accessDescription: "Only the provider owner can access partners.",
      })} />
      <Route path="/provider/members/invitations" component={guardedProviderPage(ProviderInvitationsPage, { managedSection: true })} />
      <Route path="/provider/analytics" component={guardedProviderPage(ProviderWorkspacePage)} />
      <Route path="/provider/analytics/storefront" component={guardedProviderPage(ProviderStorefrontPage)} />
      <Route path="/provider/analytics/showcase" component={guardedProviderPage(ProviderStorefrontPage)} />
      <Route path="/provider/onboarding" component={ProviderOnboardingPage} />
      <Route path="/provider/analytics/sales-performance" component={guardedProviderPage(ProviderAnalyticsPage, {
        allowedRoles: ["owner", "manager", "accountant"],
        accessTitle: "Sales access restricted",
        accessDescription: "Only provider owners, managers, and accountants can access sales performance.",
      })} />
      <Route path="/provider/analytics/reviews-feedback" component={guardedProviderPage(ProviderReviewsPage)} />
      <Route path="/provider/payments" component={guardedProviderPage(ProviderWorkspacePage)} />
      <Route path="/provider/payments/wallet" component={guardedProviderPage(ProviderWalletPage, {
        allowedRoles: ["owner"],
        accessTitle: "Wallet access restricted",
        accessDescription: "Only the provider owner can access the wallet.",
      })} />
      <Route path="/provider/payments/records" component={guardedProviderPage(ProviderPaymentRecordsPage, {
        allowedRoles: ["owner", "manager", "accountant"],
        accessTitle: "Payment records access restricted",
        accessDescription: "Only provider owners, managers, and accountants can access payment records.",
      })} />
      <Route path="/provider/settings" component={ProviderSettingsPage} />
      <Route path="/provider/settings/preferences" component={ProviderSettingsPreferencesPage} />
      <Route path="/provider/settings/qr-code" component={ProviderSettingsQrCodePage} />
      <Route path="/provider/settings/terms-and-conditions" component={SettingsInfoPage} />
      <Route path="/provider/settings/privacy-policy" component={SettingsInfoPage} />
      <Route path="/provider/settings/help" component={() => <HelpPage isProvider />} />
      <Route path="/provider/signup" component={withMainNavigation(ProviderAccountSignupPage)} />
      <Route path="/provider/signup/*" component={() => <Navigate href="/provider/dashboard" />} />
      <Route path="/provider/partner-signup" component={ProviderPartnerSignupPage} />
      <Route path="/provider/member-signup" component={ProviderMemberSignupPage} />
      <Route path="/provider/onboarding/*" component={ProviderOnboardingPage} />
      <Route path="/provider/login" component={withMainNavigation(ProviderLoginPage)} />
      <Route path="/terms-and-conditions" component={SettingsInfoPage} />
      <Route path="/privacy-policy" component={SettingsInfoPage} />
      <Route path="/cookie-policy" component={SettingsInfoPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/checkout/:productId" component={CheckoutPage} />
      <Route path="*" component={NotFound} />
    </Router>
  );
}

function ProviderOnboardingPage() {
  const [step, setStep] = createSignal("business");
  const [loading, setLoading] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal("");
  const steps = {
    business: ProviderSignupPage,
    social: ProviderSocialLinksPage,
    gallery: ProviderGalleryPage,
    verification: ProviderVerificationPage,
    payment: ProviderPaymentPage,
  };

  onMount(async () => {
    try {
      const progress = await getCurrentProviderOnboardingStep();
      if (progress.nextStep) setStep(progress.nextStep);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load provider onboarding.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <Show when={!loading()} fallback={
      <main class="min-h-screen bg-dust-grey-900 px-4 py-10 text-center text-sm text-dust-grey-text">
        Loading provider onboarding…
      </main>
    }>
      <Show when={!errorMessage()} fallback={
        <main class="min-h-screen bg-dust-grey-900 px-4 py-10 text-center text-sm text-rose-700">
          {errorMessage()}
        </main>
      }>
        <Dynamic component={steps[step()]} onStepChange={setStep} />
      </Show>
    </Show>
  );
}

function ProviderAccessGuard(props) {
  const [state, setState] = createSignal("checking");
  const [providerName, setProviderName] = createSignal("");
  const [errorMessage, setErrorMessage] = createSignal("");

  onMount(async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setState("allowed");
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("provider_members")
        .select("provider_id, status, role")
        .eq("member_id", authData.user.id)
        .maybeSingle();
      if (membershipError) throw membershipError;
      const normalizedRole = membership?.role?.trim().toLowerCase();
      const allowedRoles = props.allowedRoles ?? [];
      if (
        props.managedSection
        && !["owner", "manager"].includes(normalizedRole)
      ) {
        setState("forbidden");
        return;
      }
      if (allowedRoles.length && !allowedRoles.includes(normalizedRole)) {
        setState("forbidden");
        return;
      }
      if (membership?.status?.toLowerCase() !== "banned") {
        setState("allowed");
        return;
      }
      if (!membership.provider_id) {
        throw new Error("Your banned membership does not identify a provider.");
      }

      const { data: provider, error: providerError } = await supabase
        .from("providers")
        .select("name")
        .eq("provider_id", membership.provider_id)
        .maybeSingle();
      if (providerError) throw providerError;
      if (!provider?.name?.trim()) {
        throw new Error("The provider name for this banned membership could not be found.");
      }

      setProviderName(provider.name.trim());
      setState("banned");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to verify provider access.");
      setState("error");
    }
  });

  return (
    <Show
      when={state() !== "checking"}
      fallback={
        <main
          class="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-dust-grey-900 px-5 py-12 text-dust-grey-100"
          role="status"
          aria-busy="true"
          aria-live="polite"
        >
          <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <div class="absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-fern-500/10 blur-3xl" />
            <div class="absolute -bottom-48 -left-32 size-[32rem] rounded-full bg-pine-teal-500/10 blur-3xl" />
            <div class="absolute -right-36 top-1/3 size-[30rem] rounded-full bg-hunter-green-500/10 blur-3xl" />
            <div class="absolute inset-0 bg-[radial-gradient(var(--color-dust-grey-600)_0.7px,transparent_0.7px)] [background-size:28px_28px] opacity-30" />
          </div>

          <section class="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-dust-grey-600 bg-dust-grey-900/90 shadow-2xl shadow-hunter-green-500/10 backdrop-blur-xl">
            <div class="flex items-center justify-between border-b border-dust-grey-600/70 px-6 py-5 sm:px-9">
              <img src="/logo_pack/logo-horizontal-multicolor.svg" alt="Bakimono" class="h-8 w-auto" width="240" height="64" />
              <span class="inline-flex items-center gap-2 rounded-full border border-fern-500/20 bg-fern-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-fern-text">
                <span class="size-1.5 animate-pulse rounded-full bg-fern-500" aria-hidden="true" />
                Secure check
              </span>
            </div>

            <div class="px-6 py-12 text-center sm:px-12 sm:py-16">
              <div class="relative mx-auto flex size-36 items-center justify-center sm:size-44" aria-hidden="true">
                <span class="absolute inset-0 rounded-full border border-fern-500/15" />
                <span class="absolute inset-3 animate-[spin_12s_linear_infinite] rounded-full border border-dashed border-fern-500/35 motion-reduce:animate-none" />
                <span class="absolute inset-5 animate-[spin_8s_linear_infinite_reverse] rounded-full border-2 border-transparent border-t-fern-500 border-r-pine-teal-500 motion-reduce:animate-none" />
                <span class="absolute inset-9 animate-ping rounded-full bg-fern-500/10 motion-reduce:animate-none" />
                <span class="relative flex size-20 items-center justify-center rounded-[1.75rem] border border-dust-grey-600 bg-dust-grey-800 shadow-lg shadow-hunter-green-500/10 sm:size-24 sm:rounded-[2rem]">
                  <img src="/logo_pack/emblem-multicolor.svg" alt="" class="size-12 sm:size-14" width="64" height="64" />
                </span>
              </div>

              <p class="mt-9 text-xs font-semibold uppercase tracking-[0.24em] text-fern-text">Provider workspace</p>
              <h1 class="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">Getting your workspace ready</h1>
              <p class="mx-auto mt-3 max-w-md text-sm leading-6 text-dust-grey-text sm:text-base">
                We’re securely checking your access before loading your provider tools.
              </p>

              <div class="mx-auto mt-8 h-1.5 max-w-xs overflow-hidden rounded-full bg-dust-grey-700" aria-hidden="true">
                <div class="h-full w-2/5 animate-loading rounded-full bg-linear-to-r from-hunter-green-500 via-fern-500 to-pine-teal-500 motion-reduce:animate-none" />
              </div>
              <p class="mt-4 text-xs font-medium text-dust-grey-text">Verifying membership and permissions…</p>
            </div>

            <div class="grid grid-cols-3 gap-3 border-t border-dust-grey-600/70 bg-dust-grey-800/50 px-5 py-4 sm:px-9">
              <div class="h-2 animate-pulse rounded-full bg-dust-grey-700" aria-hidden="true" />
              <div class="h-2 animate-pulse rounded-full bg-dust-grey-700 [animation-delay:150ms]" aria-hidden="true" />
              <div class="h-2 animate-pulse rounded-full bg-dust-grey-700 [animation-delay:300ms]" aria-hidden="true" />
            </div>
          </section>
        </main>
      }
    >
      <Show
        when={state() === "allowed"}
        fallback={
          <main class="min-h-screen bg-dust-grey-900 px-6 py-24 text-center text-dust-grey-100">
            <section class="mx-auto max-w-xl rounded-3xl border border-dust-grey-600 bg-dust-grey-800 p-8">
              <Show
                when={state() === "forbidden"}
                fallback={
                  <Show
                    when={state() === "banned"}
                    fallback={
                      <>
                        <h1 class="font-serif text-3xl">Provider access unavailable</h1>
                        <p role="alert" class="mt-4 text-sm text-dust-grey-200">{errorMessage()}</p>
                      </>
                    }
                  >
                    <h1 class="font-serif text-3xl">Provider access restricted</h1>
                    <p role="alert" class="mt-4 text-sm text-dust-grey-200">
                      You have been banned by {providerName()}.
                    </p>
                  </Show>
                }
              >
                <h1 class="font-serif text-3xl">{props.accessTitle ?? "Members access restricted"}</h1>
                <p role="alert" class="mt-4 text-sm text-dust-grey-200">
                  {props.accessDescription ?? "Only provider owners and managers can access member management."}
                </p>
              </Show>
              <A href="/provider/settings" class="mt-6 inline-flex rounded-full bg-hunter-green-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hunter-green-400">
                Open provider settings
              </A>
            </section>
          </main>
        }
      >
        {() => <Dynamic component={props.component} />}
      </Show>
    </Show>
  );
}

function AppShell(props) {
  const location = useLocation();
  const isProviderSignupPage = () =>
    location.pathname.startsWith("/provider/signup");
  const isProviderAuthPage = () =>
    isProviderSignupPage()
    || location.pathname === "/provider/login"
    || location.pathname === "/provider/partner-signup"
    || location.pathname === "/provider/member-signup";
  const isProviderSubPage = () =>
    location.pathname.startsWith("/provider/") && !isProviderAuthPage();
  const usesPublicNavigation = () =>
    ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/provider"].includes(location.pathname)
    || isProviderAuthPage();
  const hasAppNavigation = () =>
    !usesPublicNavigation() && !isProviderSubPage();
  const hasProviderNavigation = () => isProviderSubPage();

  return (
    <div class="min-h-dvh pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      <Show when={!usesPublicNavigation() && !isProviderSubPage()}>
        <AppNavigation />
      </Show>
      <Show when={isProviderSubPage()}>
        <ProviderNavigation />
      </Show>
      <div class={`${hasAppNavigation() || hasProviderNavigation() ? "pb-20 lg:pb-0" : ""} ${hasAppNavigation() || hasProviderNavigation() ? "lg:pl-18" : ""}`}>
        <Suspense>
          {props.children}
        </Suspense>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <main class="mx-auto max-w-2xl px-6 py-24 text-center text-dust-grey-100">
      <h1 class="font-serif text-4xl font-semibold">Page not found</h1>
      <p class="mt-4 text-dust-grey-200">The page you requested doesn’t exist.</p>
      <A href="/" class="mt-6 inline-block font-semibold text-hunter-green-500 hover:underline">
        Back to home
      </A>
    </main>
  );
}
