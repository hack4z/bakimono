import { createSignal, onMount, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { ArrowRight, Eye, EyeOff, LoaderCircle, UserPlus } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import { getSupabaseErrorMessage, normalizeKenyanPhone } from "~/utils/supabase";
import { supabase } from "~/utils/supabase-client";

const inputClass =
  "h-12 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-text focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900";

export default function ProviderMemberSignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = createSignal(true);
  const [submitting, setSubmitting] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [membership, setMembership] = createSignal(null);
  const [phoneDigits, setPhoneDigits] = createSignal("");
  const [passwordValue, setPasswordValue] = createSignal("");
  const [confirmPasswordValue, setConfirmPasswordValue] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false);
  const passwordMatchStatus = () => {
    if (!confirmPasswordValue()) return "";
    return passwordValue() === confirmPasswordValue() ? "match" : "mismatch";
  };

  onMount(async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      const user = authData.session?.user;
      if (!user) {
        const providerId = String(searchParams.provider_id ?? "").trim();
        const redirect = providerId
          ? `/provider/member-signup?provider_id=${encodeURIComponent(providerId)}`
          : "/provider/member-signup";
        navigate(`/provider/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
        return;
      }

      const providerId = String(searchParams.provider_id ?? "").trim();
      let query = supabase
        .from("provider_members")
        .select("entry_id, provider_id, role, status")
        .eq("member_id", user.id);
      if (providerId) query = query.eq("provider_id", providerId);

      const { data, error } = await query.limit(providerId ? 1 : 2);
      if (error) throw error;
      if (!data?.length) {
        throw new Error("No provider membership was found for your signed-in account.");
      }
      if (!providerId && data.length > 1) {
        throw new Error("Your account is linked to multiple provider workspaces. Open member signup from the correct provider workspace.");
      }
      setMembership(data[0]);
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, "Unable to verify your provider membership."));
    } finally {
      setLoading(false);
    }
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting()) return;

    const currentMembership = membership();
    if (!currentMembership) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = normalizeKenyanPhone(phoneDigits());
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirm_password") ?? "");

    setErrorMessage("");
    if (!name) {
      setErrorMessage("Enter your name.");
      return;
    }
    if (!phone) {
      setErrorMessage("Enter a valid Kenyan phone number.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      const user = authData.session?.user;
      if (!user) throw new Error("Sign in to complete member signup.");

      const { data: existingMembership, error: membershipLookupError } = await supabase
        .from("provider_members")
        .select("entry_id")
        .eq("entry_id", currentMembership.entry_id)
        .eq("member_id", user.id)
        .maybeSingle();
      if (membershipLookupError) throw membershipLookupError;
      if (!existingMembership) {
        throw new Error("Your provider membership could not be found. Contact the provider owner for help.");
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password,
        data: { full_name: name, phone },
      });
      if (passwordError) throw passwordError;

      const { data: updatedMembership, error: membershipError } = await supabase
        .from("provider_members")
        .update({ name, phone, status: "active" })
        .eq("entry_id", currentMembership.entry_id)
        .eq("member_id", user.id)
        .select("entry_id")
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (!updatedMembership) {
        throw new Error("Your name and phone number could not be saved to your provider membership. Check the provider_members update policy.");
      }

      navigate("/provider/dashboard/orders-bookings", { replace: true });
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, "Unable to complete member signup."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 py-10 sm:px-7 sm:py-14 lg:px-10">
      <div class="mx-auto max-w-180">
        <BrandBanner
          eyebrow="Provider membership"
          title="Complete member signup."
          description="Set up your account for the provider workspace linked to your account."
        />
        <section class="mt-8 rounded-3xl border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-7">
          <Show when={!loading()} fallback={<LoaderCircle class="mx-auto animate-spin text-hunter-green-500" />}>
            <Show when={!errorMessage()} fallback={
              <div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
                {errorMessage()}
              </div>
            }>
              <form onSubmit={handleSubmit} class="space-y-5">
                <label class="block">
                  <span class="mb-2 block text-sm font-semibold text-dust-grey-100">Full name</span>
                  <input name="name" class={inputClass} autocomplete="name" required placeholder="Enter your full name" />
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-semibold text-dust-grey-100">Phone number</span>
                  <span class="flex h-12 w-full overflow-hidden rounded-xl border border-dust-grey-600 bg-dust-grey-900 focus-within:border-fern-500 focus-within:ring-2 focus-within:ring-dry-sage-900">
                    <span class="inline-flex w-16 shrink-0 items-center justify-center border-r border-dust-grey-600 bg-dust-grey-800 text-sm font-semibold text-dust-grey-200">
                      254
                    </span>
                    <input
                      name="phone"
                      type="tel"
                      inputmode="numeric"
                      autocomplete="tel-national"
                      maxlength="9"
                      pattern="[17][0-9]{8}"
                      value={phoneDigits()}
                      onInput={(event) => setPhoneDigits(event.currentTarget.value.replace(/\D/g, "").slice(0, 9))}
                      aria-label="Phone number after country code 254"
                      class="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-text"
                      placeholder="712345678"
                      required
                    />
                  </span>
                </label>
                <PasswordField
                  label="Password"
                  name="password"
                  visible={showPassword()}
                  onInput={(value) => setPasswordValue(value)}
                  onToggle={() => setShowPassword((visible) => !visible)}
                />
                <PasswordField
                  label="Confirm password"
                  name="confirm_password"
                  visible={showConfirmPassword()}
                  onInput={(value) => setConfirmPasswordValue(value)}
                  onToggle={() => setShowConfirmPassword((visible) => !visible)}
                  matchStatus={passwordMatchStatus}
                />
                <button
                  type="submit"
                  disabled={submitting()}
                  class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Show when={submitting()} fallback={<><UserPlus size={18} aria-hidden="true" /> Complete signup <ArrowRight size={18} aria-hidden="true" /></>}>
                    <LoaderCircle size={18} class="animate-spin" aria-hidden="true" /> Saving details…
                  </Show>
                </button>
              </form>
            </Show>
          </Show>
        </section>
      </div>
    </main>
  );
}

function PasswordField(props) {
  return (
    <label class="block">
      <span class="mb-2 block text-sm font-semibold text-dust-grey-100">{props.label}</span>
      <span class="relative block">
        <input
          name={props.name}
          type={props.visible ? "text" : "password"}
          autocomplete="new-password"
          minlength="8"
          required
          placeholder={props.label}
          aria-invalid={props.matchStatus?.() === "mismatch" ? "true" : undefined}
          class={props.matchStatus?.() === "mismatch"
            ? `${inputClass} border-rose-500 pr-12`
            : `${inputClass} pr-12`}
          onInput={(event) => props.onInput(event.currentTarget.value)}
        />
        <button
          type="button"
          onClick={props.onToggle}

          class="absolute right-3 top-1/2 -translate-y-1/2 text-dust-grey-text"
        >
          <Show when={props.visible} fallback={<Eye size={18} aria-hidden="true" />}>
            <EyeOff size={18} aria-hidden="true" />
          </Show>
        </button>
      </span>
      <Show when={props.matchStatus?.()}>
        {(status) => (
          <span
            role="status"
            class={`mt-1.5 block text-xs ${status() === "match" ? "text-fern-text" : "text-rose-600"}`}
          >
            {status() === "match" ? "Passwords match." : "Passwords do not match."}
          </span>
        )}
      </Show>
    </label>
  );
}
