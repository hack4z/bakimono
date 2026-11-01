import { createSignal, Show } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-solid";
import { getSupabaseErrorMessage } from "~/utils/supabase";
import { supabase } from "~/utils/supabase-client";

export default function PasswordRecoveryPage() {
  const location = useLocation();
  const isReset = () => location.pathname === "/reset-password";
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [message, setMessage] = createSignal("");
  const [errorMessage, setErrorMessage] = createSignal("");

  async function sendResetLink(event) {
    event.preventDefault();
    if (submitting()) return;
    setSubmitting(true);
    setMessage("");
    setErrorMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email().trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage("Check your email for a password reset link.");
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, "Unable to send the password reset email."));
    } finally {
      setSubmitting(false);
    }
  }

  async function updatePassword(event) {
    event.preventDefault();
    if (submitting()) return;
    setSubmitting(true);
    setMessage("");
    setErrorMessage("");
    try {
      if (password().length < 8) throw new Error("Your new password must be at least 8 characters.");
      if (password() !== confirmPassword()) throw new Error("The passwords do not match.");
      const { error } = await supabase.auth.updateUser({ password: password() });
      if (error) throw error;
      setMessage("Your password has been updated. You can now sign in.");
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, "Unable to update your password."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main class="min-h-[calc(100vh-76px)] bg-dust-grey-900 px-5 py-12">
      <div class="mx-auto w-full max-w-md rounded-7 border border-dust-grey-600 bg-white p-6 shadow-sm sm:p-8">
        <A href="/login" class="inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> Back to sign in
        </A>
        <h1 class="mt-7 font-serif text-4xl tracking-[-0.04em] text-dust-grey-100">
          {isReset() ? "Choose a new password" : "Forgot your password?"}
        </h1>
        <p class="mt-3 text-sm leading-6 text-dust-grey-200">
          {isReset()
            ? "Enter and confirm your new account password."
            : "Enter your email address and we’ll send you a password reset link."}
        </p>

        <Show when={!isReset()} fallback={
          <form onSubmit={updatePassword} class="mt-6 space-y-4">
            <label class="block text-sm font-medium text-dust-grey-100">
              New password
              <div class="relative mt-2">
                <input type={showPassword() ? "text" : "password"} autocomplete="new-password" required minLength="8" value={password()} onInput={(event) => setPassword(event.currentTarget.value)} class="h-13 w-full rounded-xl border border-dust-grey-600 px-4 pr-12 text-sm text-dust-grey-100 outline-none focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900" />
                <button type="button" onClick={() => setShowPassword(!showPassword())} class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-dust-grey-text">
                  {showPassword() ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <label class="block text-sm font-medium text-dust-grey-100">
              Confirm new password
              <input type={showPassword() ? "text" : "password"} autocomplete="new-password" required minLength="8" value={confirmPassword()} onInput={(event) => setConfirmPassword(event.currentTarget.value)} class="mt-2 h-13 w-full rounded-xl border border-dust-grey-600 px-4 text-sm text-dust-grey-100 outline-none focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900" />
            </label>
            <button type="submit" disabled={submitting()} class="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-hunter-green-500 text-sm font-semibold text-white disabled:opacity-60">
              {submitting() ? "Updating…" : "Update password"} <ArrowRight size={17} />
            </button>
          </form>
        }>
          <form onSubmit={sendResetLink} class="mt-6 space-y-4">
            <label for="recovery-email" class="block text-sm font-medium text-dust-grey-100">Email address</label>
            <input id="recovery-email" type="email" autocomplete="email" required value={email()} onInput={(event) => setEmail(event.currentTarget.value)} placeholder="you@example.com" class="h-13 w-full rounded-xl border border-dust-grey-600 px-4 text-sm text-dust-grey-100 outline-none focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900" />
            <button type="submit" disabled={submitting()} class="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-hunter-green-500 text-sm font-semibold text-white disabled:opacity-60">
              {submitting() ? "Sending…" : "Send reset link"} <ArrowRight size={17} />
            </button>
          </form>
        </Show>
        <Show when={errorMessage()}>
          <p role="alert" class="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage()}</p>
        </Show>
        <Show when={message()}>
          <p role="status" class="mt-4 rounded-lg bg-dry-sage-900 px-4 py-3 text-sm text-hunter-green-500">{message()}</p>
        </Show>
      </div>
    </main>
  );
}
