import { createSignal, Show } from "solid-js";
import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { ArrowRight, Eye, EyeOff, Store } from "lucide-solid";
import GoogleSignInButton from "~/components/GoogleSignInButton";
import { getSupabaseErrorMessage } from "~/utils/supabase";
import { supabase } from "~/utils/supabase-client";

const inputClass =
  "h-12.5 w-full rounded-xl border border-dust-grey-600 bg-white px-4 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-text focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900";

export default function ProviderLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const postLoginRedirect = () =>
    typeof searchParams.redirect === "string" && searchParams.redirect.startsWith("/")
      ? searchParams.redirect
      : "/provider/dashboard";
  const [showPassword, setShowPassword] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting()) return;

    setErrorMessage("");
    setSubmitting(true);

    try {
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email") ?? "").trim().toLowerCase();
      const password = String(form.get("password") ?? "");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Supabase did not return a user after sign-in.");
      navigate(postLoginRedirect(), { replace: true });
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, "Unable to sign in to your provider account."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main class="min-h-[calc(100vh-76px)] bg-dust-grey-900">
      <div class="mx-auto grid min-h-[calc(100vh-76px)] max-w-360 lg:grid-cols-[0.92fr_1.08fr]">
        <section class="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
          <div class="w-full max-w-140">
            <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-dry-sage-800 bg-dry-sage-900 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-hunter-green-500">
              <Store size={13} aria-hidden="true" />
              PROVIDER SIGN IN
            </div>

            <h1 class="font-serif text-[40px] leading-[1.08] tracking-[-0.045em] text-dust-grey-100 sm:text-[48px]">
              Welcome back
              <span class="mt-1 block text-hunter-green-500">to your workspace.</span>
            </h1>
            <p class="mt-3 max-w-105 text-[15px] leading-7 text-dust-grey-200">
              Sign in to manage your business profile and provider workspace.
            </p>

            <div class="mt-6 rounded-xl border border-fern-500/30 bg-dry-sage-900 px-4 py-3 text-sm leading-6 text-dust-grey-200">
              Provider accounts are for business owners and authorized representatives. Use the account linked to your provider membership.
            </div>

            <div class="mt-7">
              <GoogleSignInButton redirectTo={`${window.location.origin}${postLoginRedirect()}`} />
              <div class="my-6 flex items-center gap-4">
                <span class="h-px flex-1 bg-dust-grey-600" />
                <span class="text-xs text-dust-grey-text">or sign in with email</span>
                <span class="h-px flex-1 bg-dust-grey-600" />
              </div>
            </div>

            <form class="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label for="provider-login-email" class="mb-2 block text-sm font-medium text-dust-grey-100">
                  Email address
                </label>
                <input
                  id="provider-login-email"
                  name="email"
                  type="email"
                  autocomplete="username"
                  autocapitalize="none"
                  spellcheck={false}
                  placeholder="you@yourbusiness.com"
                  required
                  class={inputClass}
                />
              </div>

              <div>
                <div class="mb-2 flex items-center justify-between gap-3">
                  <label for="provider-login-password" class="text-sm font-medium text-dust-grey-100">
                    Password
                  </label>
                  <A href="/forgot-password" class="text-xs font-medium text-hunter-green-500 hover:underline">
                    Forgot password?
                  </A>
                </div>
                <div class="relative">
                  <input
                    id="provider-login-password"
                    name="password"
                    type={showPassword() ? "text" : "password"}
                    autocomplete="current-password"
                    placeholder="Enter your password"
                    required
                    class={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"

                    aria-pressed={showPassword()}
                    onClick={() => setShowPassword(!showPassword())}
                    class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-dust-grey-text transition hover:text-dust-grey-100"
                  >
                    {showPassword() ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting()}
                class="group flex h-13.5 w-full items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 disabled:cursor-wait disabled:opacity-60"
              >
                {submitting() ? "Signing in…" : "Sign in to provider account"}
                <ArrowRight size={17} class="transition-transform group-hover:translate-x-1" />
              </button>
              <Show when={errorMessage()}>
                <p role="alert" class="rounded-lg border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                  {errorMessage()}
                </p>
              </Show>
            </form>

            <p class="mt-6 text-center text-sm text-dust-grey-200">
              New provider?{" "}
              <A href="/provider/signup" class="font-semibold text-hunter-green-500 hover:underline">
                Create a provider account
              </A>
            </p>
            <p class="mt-3 text-center text-sm text-dust-grey-200">
              Looking for customer sign in?{" "}
              <A href="/login" class="font-semibold text-hunter-green-500 hover:underline">
                Go to customer login
              </A>
            </p>
          </div>
        </section>

        <aside class="relative hidden min-h-170 overflow-hidden bg-hunter-green-200 lg:block">
          <img
            src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1800&q=85"
            alt="A small business team working together"
            class="absolute inset-0 size-full object-cover"
          width="800" height="600" />
          <div class="absolute inset-0 bg-linear-to-t from-pine-teal-100/85 via-pine-teal-100/10 to-pine-teal-100/10 dark:from-pine-teal-900/85 dark:via-pine-teal-900/10 dark:to-pine-teal-900/10" />
          <div class="absolute right-8 top-8 rounded-2xl border border-white/25 bg-pine-teal-100/45 p-3 backdrop-blur-md">
            <img src="/logo_pack/logo-horizontal-on-dark.svg" alt="Bakimono" class="h-8 w-auto" width="240" height="64" />
          </div>
          <div class="absolute inset-x-0 bottom-0 p-10 xl:p-14">
            <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
              Provider workspace
            </div>
            <h2 class="max-w-130 font-serif text-4xl leading-[1.12] tracking-[-0.04em] text-white xl:text-[54px]">
              Good to have you <span class="text-dry-sage-500">back.</span>
            </h2>
            <p class="mt-4 max-w-107.5 text-[15px] leading-7 text-white/80">
              Pick up where you left off and keep your business moving forward.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
