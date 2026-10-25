import { A, Route, Router, useLocation } from "@solidjs/router";
import { Show, Suspense } from "solid-js";
import AppNavigation from "~/components/AppNavigation";
import BookingsPage from "~/components/BookingsPage";
import CheckoutPage from "~/components/CheckoutPage";
import DashboardPage from "~/components/DashboardPage";
import ExplorePage from "~/components/ExplorePage";
import LoginPage from "~/components/LoginPage";
import Nav from "~/components/Nav";
import SignupPage from "~/components/SignupPage";
import SettingsPage, { SettingsInfoPage } from "~/components/SettingsPage";
import "./app.css";

export default function App() {
  return (
    <Router
      root={props => <AppShell>{props.children}</AppShell>}
    >
      <Route path="/" component={LoginPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/explore" component={ExplorePage} />
      <Route path="/bookings" component={BookingsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/terms-and-conditions" component={SettingsInfoPage} />
      <Route path="/privacy-policy" component={SettingsInfoPage} />
      <Route path="/cookie-policy" component={SettingsInfoPage} />
      <Route path="/help" component={SettingsInfoPage} />
      <Route path="/checkout/:productId" component={CheckoutPage} />
      <Route path="*" component={NotFound} />
    </Router>
  );
}

function AppShell(props) {
  const location = useLocation();
  const isPublicPage = () => ["/", "/login", "/signup"].includes(location.pathname);

  return (
    <>
      <Show when={isPublicPage()}>
        <Nav />
      </Show>
      <Show when={!isPublicPage()}>
        <AppNavigation />
      </Show>
      <div class={isPublicPage() ? "" : "pb-20 lg:pb-0 lg:pl-[88px]"}>
        <Suspense>{props.children}</Suspense>
      </div>
    </>
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
