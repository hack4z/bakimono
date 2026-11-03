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
  const [invitation, setInvitation] = createSignal(null);
  const [showPassword, setShowPassword] = createSignal(false);
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false);

  onMount(async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        const providerId = String(searchParams.provider_id ?? "").trim();
        const redirect = providerId
          ? `/provider/member-signup?provider_id=${encodeURIComponent(providerId)}`
          : "/provider/member-signup";
        navigate(`/provider/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
        return;
      }

      const email = authData.user.email?.trim().toLowerCase();
      const providerId = String(searchParams.provider_id ?? "").trim();
      let query = supabase
        .from("provider_invitations")
        .select("entry_id, email, provider_id, role, status, expires_at")
        .eq("status", "pending")
        .neq("role", "partner");
      if (providerId) query = query.eq("provider_id", providerId);
      if (email) query = query.eq("email", email);

      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No pending provider member invitation was found for your account.");
      if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
        throw new Error("This provider member invitation has expired.");
      }
      setInvitation(data);
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, "Unable to verify your member invitation."));
    } finally {
      setLoading(false);
    }
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting()) return;

    const currentInvitation = invitation();
    if (!currentInvitation) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = normalizeKenyanPhone(form.get("phone"));
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
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error("Sign in to complete member signup.");

      const { error: passwordError } = await supabase.auth.updateUser({
        password,
        data: { full_name: name, phone },
      });
      if (passwordError) throw passwordError;

      const { data: membership, error: membershipLookupError } = await supabase
        .from("provider_members")
        .select("entry_id")
        .eq("provider_id", currentInvitation.provider_id)
        .eq("member_id", user.id)
        .maybeSingle();
      if (membershipLookupError) throw membershipLookupError;

      if (membership) {
        const { error: membershipError } = await supabase
          .from("provider_members")
          .update({ name, phone, status: "active" })
          .eq("entry_id", membership.entry_id);
        if (membershipError) throw membershipError;
      } else {
        const { error: membershipError } = await supabase
          .from("provider_members")
          .insert({
            provider_id: currentInvitation.provider_id,
            member_id: user.id,
            name,
            phone,
            role: currentInvitation.role,
            status: "active",
          });
        if (membershipError) throw membershipError;
      }

      const { error: invitationError } = await supabase
        .from("provider_invitations")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("entry_id", currentInvitation.entry_id);
      if (invitationError) throw invitationError;

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
          eyebrow="Provider invitation"
          title="Complete member signup."
          description="Set up your account to join the provider workspace."
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
                  <input name="phone" type="tel" class={inputClass} autocomplete="tel" required placeholder="0712 345 678" />
                </label>
                <PasswordField label="Password" name="password" visible={showPassword()} onToggle={() => setShowPassword((visible) => !visible)} />
                <PasswordField label="Confirm password" name="confirm_password" visible={showConfirmPassword()} onToggle={() => setShowConfirmPassword((visible) => !visible)} />
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
          class={`${inputClass} pr-12`}
          autocomplete="new-password"
          minlength="8"
          required
          placeholder={props.label}
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
    </label>
  );
}
