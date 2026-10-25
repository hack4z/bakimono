import { createSignal } from "solid-js";
import { ArrowRight, Eye, EyeOff, MapPin, Sparkles, Star } from "lucide-solid";
import GoogleSignInButton from "~/components/GoogleSignInButton";

export default function LoginPage() {
  const [showPassword, setShowPassword] = createSignal(false);
  const [message, setMessage] = createSignal("");

  function handleSubmit(event) {
    event.preventDefault();
    setMessage("Sign-in is not connected yet. Please check back soon.");
  }

  return (
    <main class="min-h-[calc(100vh-76px)] bg-dust-grey-900">
      <div class="mx-auto grid min-h-[calc(100vh-76px)] max-w-[1440px] lg:grid-cols-[0.92fr_1.08fr]">
        <section class="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-16 xl:px-24">
          <div class="w-full max-w-[430px]">
            <div class="mb-8 inline-flex items-center gap-2 rounded-full border border-dry-sage-800 bg-dry-sage-900 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-hunter-green-500">
              <Sparkles size={13} aria-hidden="true" />
              THE GOOD LIFE, ALL IN ONE PLACE
            </div>

            <h1 class="font-serif text-[42px] leading-[1.08] tracking-[-0.045em] text-dust-grey-100 sm:text-[50px]">
              Welcome back
              <span class="mt-1 block text-hunter-green-500">to bakimono.</span>
            </h1>
            <p class="mt-4 max-w-[360px] text-[15px] leading-7 text-dust-grey-200">
              Your next stay, favorite table, or can’t-wait-to-eat meal is just
              around the corner.
            </p>

            <div class="mt-9">
              <GoogleSignInButton />
              <div class="my-6 flex items-center gap-4">
                <span class="h-px flex-1 bg-dust-grey-600" />
                <span class="text-xs text-dust-grey-300">or continue with email</span>
                <span class="h-px flex-1 bg-dust-grey-600" />
              </div>
            </div>

            <form class="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label for="login" class="mb-2 block text-sm font-medium text-dust-grey-100">
                  Email or mobile number
                </label>
                <input
                  id="login"
                  name="login"
                  type="text"
                  autocomplete="username"
                  autocapitalize="none"
                  spellcheck={false}
                  placeholder="you@example.com or +1 555 000 0000"
                  required
                  class="h-[52px] w-full rounded-xl border border-dust-grey-600 bg-white px-4 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-300 focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900"
                />
                <p class="mt-2 text-xs text-dust-grey-300">Use the email or phone number linked to your account.</p>
              </div>

              <div>
                <div class="mb-2 flex items-center justify-between gap-3">
                  <label for="password" class="text-sm font-medium text-dust-grey-100">
                    Password
                  </label>
                  <a href="#forgot-password" class="text-xs font-medium text-hunter-green-500 hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div class="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword() ? "text" : "password"}
                    autocomplete="current-password"
                    placeholder="Enter your password"
                    required
                    class="h-[52px] w-full rounded-xl border border-dust-grey-600 bg-white px-4 pr-12 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-300 focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900"
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
              </div>

              <label class="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-dust-grey-200">
                <input
                  type="checkbox"
                  name="remember"
                  class="size-4 rounded border-dust-grey-400 accent-hunter-green-500"
                />
                Keep me signed in
              </label>

              <button
                type="submit"
                class="group flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
              >
                Log in
                <ArrowRight size={17} class="transition-transform group-hover:translate-x-1" />
              </button>

              {message() && (
                <p role="status" class="rounded-lg bg-dry-sage-900 px-4 py-3 text-sm text-hunter-green-500">
                  {message()}
                </p>
              )}
            </form>

            <p class="mt-7 text-center text-sm text-dust-grey-200">
              New to bakimono?{" "}
              <a href="/signup" class="font-semibold text-hunter-green-500 hover:underline">
                Create an account
              </a>
            </p>

            <div class="my-7 flex items-center gap-4">
              <span class="h-px flex-1 bg-dust-grey-600" />
              <span class="text-xs text-dust-grey-300">A little more than a booking</span>
              <span class="h-px flex-1 bg-dust-grey-600" />
            </div>

            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="rounded-xl border border-dust-grey-600 bg-white/60 px-2 py-3">
                <p class="font-serif text-lg text-hunter-green-500">Stay</p>
                <p class="mt-0.5 text-[11px] text-dust-grey-300">somewhere lovely</p>
              </div>
              <div class="rounded-xl border border-dust-grey-600 bg-white/60 px-2 py-3">
                <p class="font-serif text-lg text-hunter-green-500">Dine</p>
                <p class="mt-0.5 text-[11px] text-dust-grey-300">save your table</p>
              </div>
              <div class="rounded-xl border border-dust-grey-600 bg-white/60 px-2 py-3">
                <p class="font-serif text-lg text-hunter-green-500">Savor</p>
                <p class="mt-0.5 text-[11px] text-dust-grey-300">bring it to you</p>
              </div>
            </div>
          </div>
        </section>

        <aside class="relative hidden min-h-[680px] overflow-hidden bg-hunter-green-200 lg:block">
          <img
            src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1800&q=85"
            alt="Warm, inviting hotel room with a view"
            class="absolute inset-0 size-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-pine-teal-100/85 via-pine-teal-100/10 to-pine-teal-100/10 dark:from-[#0a0f0d]/85 dark:via-[#0a0f0d]/10 dark:to-[#0a0f0d]/10" />
          <div class="absolute right-8 top-8 rounded-2xl border border-white/25 bg-pine-teal-100/45 p-3 backdrop-blur-md">
            <img src="/logo_pack/logo-horizontal-on-dark.svg" alt="Bakimono" class="h-8 w-auto" />
          </div>

          <div class="absolute left-10 top-10 flex items-center gap-2 rounded-full border border-white/30 bg-pine-teal-100/20 px-4 py-2.5 text-sm text-white backdrop-blur-md">
            <MapPin size={15} aria-hidden="true" />
            Made for getting away
          </div>

          <div class="absolute inset-x-0 bottom-0 p-10 xl:p-14">
            <div class="mb-5 flex items-center gap-1 text-dry-sage-500">
              <Star size={15} fill="currentColor" />
              <Star size={15} fill="currentColor" />
              <Star size={15} fill="currentColor" />
              <Star size={15} fill="currentColor" />
              <Star size={15} fill="currentColor" />
              <span class="ml-2 text-sm text-white/85">Loved by curious travelers</span>
            </div>
            <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
              <Sparkles size={13} aria-hidden="true" />
              Stay a little different
            </div>
            <h2 class="max-w-[560px] font-serif text-4xl leading-[1.12] tracking-[-0.04em] text-white xl:text-[54px]">
              Make room for <span class="text-dry-sage-500">wonder.</span>
            </h2>
            <p class="mt-4 max-w-[430px] text-[15px] leading-7 text-white/80">
              Find the tucked-away stay, book the table worth lingering at, and
              have something delicious find its way to you.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
