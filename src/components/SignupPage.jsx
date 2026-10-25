import { createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import { ArrowRight, Eye, EyeOff, MapPin, Sparkles } from "lucide-solid";
import GoogleSignInButton from "~/components/GoogleSignInButton";

const inputClass =
  "h-[50px] w-full rounded-xl border border-dust-grey-600 bg-white px-4 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-300 focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900";

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
  const [showPassword, setShowPassword] = createSignal(false);
  const [message, setMessage] = createSignal("");
  const [acceptedTerms, setAcceptedTerms] = createSignal(false);

  function handleSubmit(event) {
    event.preventDefault();
    if (!acceptedTerms()) return;
    setMessage("Account creation is not connected yet. Please check back soon.");
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
                <p class="mt-2 text-center text-xs text-dust-grey-300">
                  Accept the terms below to continue with Google.
                </p>
              </Show>
              <div class="my-6 flex items-center gap-4">
                <span class="h-px flex-1 bg-dust-grey-600" />
                <span class="text-xs text-dust-grey-300">or sign up with email</span>
                <span class="h-px flex-1 bg-dust-grey-600" />
              </div>
            </div>

            <form class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2" onSubmit={handleSubmit}>
              <Field
                id="username"
                label="Username"
                autocomplete="username"
                placeholder="How should we call you?"
              />
              <Field
                id="dateOfBirth"
                name="dateOfBirth"
                label="Date of birth"
                type="date"
                autocomplete="bday"
              />
              <Field
                id="email"
                label="Email address"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
              />
              <Field
                id="phone"
                label="Phone number"
                type="tel"
                autocomplete="tel"
                placeholder="+1 555 000 0000"
              />
              <Field
                id="city"
                label="City"
                autocomplete="address-level2"
                placeholder="Your city"
              />
              <Field
                id="address"
                label="Street address"
                autocomplete="street-address"
                placeholder="Street and house number"
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
                    aria-label={showPassword() ? "Hide password" : "Show password"}
                    aria-pressed={showPassword()}
                    onClick={() => setShowPassword(!showPassword())}
                    class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-dust-grey-300 transition hover:text-dust-grey-100"
                  >
                    {showPassword() ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p class="mt-2 text-xs text-dust-grey-300">Use at least 8 characters.</p>
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
                    class="font-semibold text-hunter-green-500 underline underline-offset-2 hover:text-fern-500"
                  >
                    Terms &amp; Conditions
                  </A>
                  .
                </span>
              </label>

              <div class="sm:col-span-2">
                <button
                  type="submit"
                  class="group flex h-13.5 w-full items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
                >
                  Create account
                  <ArrowRight size={17} class="transition-transform group-hover:translate-x-1" />
                </button>
                {message() && (
                  <p role="status" class="mt-3 rounded-lg bg-dry-sage-900 px-4 py-3 text-sm text-hunter-green-500">
                    {message()}
                  </p>
                )}
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
            src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1800&q=85"
            alt="A warm, inviting room ready for a getaway"
            class="absolute inset-0 size-full object-cover"
          />
          <div class="absolute inset-0 bg-linear-to-t from-pine-teal-100/85 via-pine-teal-100/10 to-pine-teal-100/10 dark:from-pine-teal-900/85 dark:via-pine-teal-900/10 dark:to-pine-teal-900/10" />
          <div class="absolute right-8 top-8 rounded-2xl border border-white/25 bg-pine-teal-100/45 p-3 backdrop-blur-md">
            <img src="/logo_pack/logo-horizontal-on-dark.svg" alt="Bakimono" class="h-8 w-auto" />
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