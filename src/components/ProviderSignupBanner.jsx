import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { A } from "@solidjs/router";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-solid";
import { supabase } from "~/utils/supabase";
import { getCurrentProviderOnboardingStep } from "~/utils/provider-onboarding";

export default function ProviderSignupBanner(props) {
  const [status, setStatus] = createSignal("checking");
  const [errorMessage, setErrorMessage] = createSignal("");
  const [verificationMessage, setVerificationMessage] = createSignal("");
  const [isResending, setIsResending] = createSignal(false);
  const [email, setEmail] = createSignal("");
  const [retry, setRetry] = createSignal(0);

  createEffect(() => {
    retry();

    let active = true;
    setStatus("checking");
    setErrorMessage("");
    setVerificationMessage("");
    props.onEmailVerified?.(false);

    async function checkSignup() {
      try {
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;
        const user = authData.session?.user;
        if (!user) {
          props.onEmailVerified?.(false);
          if (active) setStatus("complete");
          return;
        }
        if (active) setEmail(user.email ?? "");
        const isVerified = Boolean(user.email_confirmed_at);
        props.onEmailVerified?.(isVerified);
        if (!isVerified) {
          if (active) setStatus("unverified");
          return;
        }
        if (props.verificationOnly) {
          if (active) setStatus("complete");
          return;
        }

        const progress = await getCurrentProviderOnboardingStep();
        if (!progress.providerExists) {
          if (active) setStatus("incomplete");
          return;
        }
        if (active) setStatus(progress.complete ? "complete" : "incomplete");
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to check provider signup status.");
        setStatus("error");
      }
    }

    void checkSignup();
    onCleanup(() => {
      active = false;
    });
  });

  async function resendVerificationEmail() {
    if (!email() || isResending()) return;
    setVerificationMessage("");
    setErrorMessage("");
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setVerificationMessage("A new verification email has been sent. Check your inbox.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to resend the verification email.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <Show when={
      status() === "unverified"
      || status() === "error"
      || (!props.verificationOnly && status() === "incomplete")
    }>
      <aside
        role={status() === "error" ? "status" : "alert"}
        aria-label={status() === "unverified" ? "Verify your email" : "Complete provider signup"}
        class="mb-5 mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-hunter-green-300 bg-dry-sage-900 p-5 text-dust-grey-100 shadow-[0_12px_30px_rgba(58,90,64,0.16)] sm:p-6"
      >
        <div class="flex items-start gap-3">
          <span class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-hunter-green-500 text-white">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-hunter-green-500">
              {status() === "error" ? "Provider setup" : status() === "unverified" ? "Email verification required" : "Action required"}
            </p>
            <h2 class="mt-1 font-serif text-2xl">
              {status() === "error"
                ? "Continue your provider setup"
                : status() === "unverified"
                  ? "Verify your email to continue"
                  : "Complete your provider signup"}
            </h2>
            <p class="mt-1 max-w-2xl text-sm leading-6 text-dust-grey-200">
              {status() === "error"
                ? "Review your provider details and continue setup. Refresh your status to check for saved progress."
                : status() === "unverified"
                  ? `Open the verification link sent to ${email() || "your email address"}. Provider onboarding will stay locked until your email is verified.`
                  : "Complete your business profile, verification, and payment details to finish setting up your provider workspace."}
            </p>
            <Show when={status() === "error"}>
              <details class="mt-2 text-xs text-dust-grey-text">
                <summary class="w-fit cursor-pointer font-semibold">Status details</summary>
                <p class="mt-1 max-w-2xl break-words">{errorMessage()}</p>
              </details>
            </Show>
            <Show when={verificationMessage()}>
              <p role="status" class="mt-2 text-sm font-semibold text-hunter-green-500">{verificationMessage()}</p>
            </Show>
          </div>
        </div>
        <div class="flex shrink-0 gap-3">
          <Show when={status() === "unverified"}>
            <button type="button" onClick={resendVerificationEmail} disabled={isResending() || !email()} class="inline-flex h-11 items-center gap-2 rounded-xl border border-hunter-green-300 px-4 text-sm font-bold text-hunter-green-500 transition hover:bg-dry-sage-800 disabled:cursor-wait disabled:opacity-60">
              {isResending() ? "Sending…" : "Resend verification"}
            </button>
            <button type="button" onClick={() => setRetry((value) => value + 1)} class="inline-flex h-11 items-center gap-2 rounded-xl border border-hunter-green-300 px-4 text-sm font-bold text-hunter-green-500 transition hover:bg-dry-sage-800">
              <RefreshCw size={15} aria-hidden="true" /> I’ve verified
            </button>
          </Show>
          <Show when={status() === "error"}>
            <button type="button" onClick={() => setRetry((value) => value + 1)} class="inline-flex h-11 items-center gap-2 rounded-xl border border-hunter-green-300 px-4 text-sm font-bold text-hunter-green-500 transition hover:bg-dry-sage-800">
              <RefreshCw size={15} aria-hidden="true" /> Refresh status
            </button>
          </Show>
          <Show when={status() !== "unverified" && !props.verificationOnly}>
            <A
              href="/provider/onboarding"
              class="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-hunter-green-500 px-4 text-sm font-bold text-white transition hover:bg-hunter-green-400"
            >
              Complete signup <ArrowRight size={16} aria-hidden="true" />
            </A>
          </Show>
        </div>
      </aside>
    </Show>
  );
}
