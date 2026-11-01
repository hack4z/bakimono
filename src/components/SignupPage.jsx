import { createSignal, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { ArrowRight, Eye, EyeOff, MapPin, Sparkles } from "lucide-solid";
import GoogleSignInButton from "~/components/GoogleSignInButton";
import { getSupabaseErrorMessage } from "~/utils/supabase";
import { supabase } from "~/utils/supabase-client";

const inputClass =
  "h-12.5 w-full rounded-xl border border-dust-grey-600 bg-white px-4 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-text focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900";

function Field(props) {
  return (
    <div class={props.class}>
      <label for={props.id} class="mb-2 block text-sm font-medium text-dust-grey-100">
        {props.label}
      </label>
      <input
        id={props.id}
        name={props.name ?? props.id}
        type={props.type ?? "text"}
        autocomplete={props.autocomplete}
        placeholder={props.placeholder}
        required
        class={inputClass}
      />
    </div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = createSignal(false);
  const [message, setMessage] = createSignal("");
  const [errorMessage, setErrorMessage] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [acceptedTerms, setAcceptedTerms] = createSignal(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!acceptedTerms() || submitting()) return;

    setMessage("");
    setErrorMessage("");
    setSubmitting(true);

    try {
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email") ?? "").trim().toLowerCase();
      const password = String(form.get("password") ?? "");
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;
      if (!authData.user) {
        throw new Error("Supabase did not return a user after signup.");
      }

      if (authData.session) {
        navigate("/settings", { replace: true });
        return;
      }

      setMessage("Your account was created. Check your email to confirm your address, then complete your profile in Settings.");
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, "Unable to create your account."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main class="min-h-[calc(100vh-76px)] bg-dust-grey-900">
      <div class="mx-auto grid min-h-[calc(100vh-76px)] max-w-360 lg:grid-cols-[1.08fr_0.92fr]">
        <section class="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
          <div class="w-full max-w-140">
            <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-dry-sage-800 bg-dry-sage-900 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-hunter-green-500">
              <Sparkles size={13} aria-hidden="true" />
              YOUR GOOD LIFE STARTS HERE
            </div>

            <h1 class="font-serif text-[40px] leading-[1.08] tracking-[-0.045em] text-dust-grey-100 sm:text-[48px]">
              Make yourself
              <span class="mt-1 block text-hunter-green-500">at home.</span>
            </h1>
            <p class="mt-3 max-w-105 text-[15px] leading-7 text-dust-grey-200">
              Create your Bakimono account and bring stays, tables, and
              delicious discoveries together.
            </p>

            <div class="mt-7">
              <GoogleSignInButton disabled={!acceptedTerms()} />
              <Show when={!acceptedTerms()}>
                <p class="mt-2 text-center text-xs text-dust-grey-text">
                  Accept the terms below to continue with Google.
                </p>
              </Show>
              <div class="my-6 flex items-center gap-4">
                <span class="h-px flex-1 bg-dust-grey-600" />
                <span class="text-xs text-dust-grey-text">or sign up with email</span>
                <span class="h-px flex-1 bg-dust-grey-600" />
              </div>
            </div>

            <form class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2" onSubmit={handleSubmit}>
              <Field
                id="email"
                label="Email address"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                class="sm:col-span-2"
              />

              <div class="sm:col-span-2">
                <label for="password" class="mb-2 block text-sm font-medium text-dust-grey-100">
                  Password
                </label>
                <div class="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword() ? "text" : "password"}
                    autocomplete="new-password"
                    placeholder="Create a password"
                    required
                    minlength="8"
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
                <p class="mt-2 text-xs text-dust-grey-text">Use at least 8 characters.</p>
              </div>

              <label class="flex items-start gap-3 text-sm leading-6 text-dust-grey-200 sm:col-span-2">
                <input
                  type="checkbox"
                  name="acceptedTerms"
                  required
                  checked={acceptedTerms()}
                  onChange={(event) => setAcceptedTerms(event.currentTarget.checked)}
                  class="mt-1 size-4 shrink-0 rounded border-dust-grey-400 accent-hunter-green-500"
                />
                <span>
                  I have read and agree to the{" "}
                  <A
                    href="/terms-and-conditions"
                    target="_blank"
                    rel="noreferrer"
                    class="font-semibold text-hunter-green-500 underline underline-offset-2 hover:text-fern-text"
                  >
                    Terms &amp; Conditions
                  </A>
                  .
                </span>
              </label>

              <div class="sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting()}
                  class="group flex h-13.5 w-full items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
                >
                  {submitting() ? "Creating account…" : "Create account"}
                  <ArrowRight size={17} class="transition-transform group-hover:translate-x-1" />
                </button>
                <Show when={errorMessage()}>
                  <p role="alert" class="mt-3 rounded-lg border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                    {errorMessage()}
                  </p>
                </Show>
                <Show when={message()}>
                  <p role="status" class="mt-3 rounded-lg bg-dry-sage-900 px-4 py-3 text-sm text-hunter-green-500">
                    {message()}
                  </p>
                </Show>
              </div>
            </form>

            <p class="mt-6 text-center text-sm text-dust-grey-200">
              Already have an account?{" "}
              <A href="/login" class="font-semibold text-hunter-green-500 hover:underline">
                Log in
              </A>
            </p>
          </div>
        </section>

        <aside class="relative hidden min-h-170 overflow-hidden bg-hunter-green-200 lg:block">
          <img
            src="/card-1.jpg"
            alt="A warm, inviting room ready for a getaway"
            class="absolute inset-0 size-full object-cover"
          width="740" height="493" />
          <div class="absolute inset-0 bg-linear-to-t from-pine-teal-100/85 via-pine-teal-100/10 to-pine-teal-100/10 dark:from-pine-teal-900/85 dark:via-pine-teal-900/10 dark:to-pine-teal-900/10" />
          <div class="absolute right-8 top-8 rounded-2xl border border-white/25 bg-pine-teal-100/45 p-3 backdrop-blur-md">
            <img src="/logo_pack/logo-horizontal-on-dark.svg" alt="Bakimono" class="h-8 w-auto" width="240" height="64" />
          </div>

          <div class="absolute left-10 top-10 flex items-center gap-2 rounded-full border border-white/30 bg-pine-teal-100/20 px-4 py-2.5 text-sm text-white backdrop-blur-md">
            <MapPin size={15} aria-hidden="true" />
            One account. So many ways to unwind.
          </div>

          <div class="absolute inset-x-0 bottom-0 p-10 xl:p-14">
            <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
              <Sparkles size={13} aria-hidden="true" />
              Stay · dine · unwind
            </div>
            <h2 class="max-w-130 font-serif text-4xl leading-[1.12] tracking-[-0.04em] text-white xl:text-[54px]">
              Make room for <span class="text-dry-sage-500">wonder.</span>
            </h2>
            <p class="mt-4 max-w-107.5 text-[15px] leading-7 text-white/80">
              From your next favorite stay to the meal you’ll still be talking
              about, Bakimono brings good moments closer.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}