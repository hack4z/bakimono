import { createSignal, onMount, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { ArrowRight, Eye, EyeOff, Handshake, LoaderCircle, Upload } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import { getSupabaseErrorMessage } from "~/utils/supabase";
import { supabase } from "~/utils/supabase-client";

const inputClass =
  "h-12 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm text-dust-grey-100 outline-none transition placeholder:text-dust-grey-text focus:border-fern-500 focus:ring-4 focus:ring-dry-sage-900";
const idTypes = ["National ID", "Passport", "Alien ID", "Driving Licence"];

export default function ProviderPartnerSignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = createSignal(true);
  const [submitting, setSubmitting] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [successMessage, setSuccessMessage] = createSignal("");
  const [invitation, setInvitation] = createSignal(null);
  const [fileName, setFileName] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false);

  onMount(async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        const providerId = String(searchParams.provider_id ?? "").trim();
        const redirect = providerId
          ? `/provider/partner-signup?provider_id=${encodeURIComponent(providerId)}`
          : "/provider/partner-signup";
        navigate(`/provider/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
        return;
      }

      const email = authData.user.email?.trim().toLowerCase();
      const providerId = String(searchParams.provider_id ?? "").trim();
      let query = supabase
        .from("provider_invitations")
        .select("entry_id, email, provider_id, role, status, expires_at")
        .eq("status", "pending")
        .eq("role", "partner");

      if (providerId) query = query.eq("provider_id", providerId);
      if (email) query = query.eq("email", email);

      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No pending partner invitation was found for your account.");
      if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
        throw new Error("This partner invitation has expired.");
      }
      setInvitation(data);
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, "Unable to verify your partner invitation."));
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
    const name = String(form.get("legal_name") ?? "").trim();
    const idType = String(form.get("id_type") ?? "").trim();
    const idNumber = String(form.get("id_number") ?? "").trim().toUpperCase();
    const idFile = form.get("id_file");
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirm_password") ?? "");

    setErrorMessage("");
    setSuccessMessage("");
    if (!name) {
      setErrorMessage("Enter your legal name.");
      return;
    }
    if (!idTypes.includes(idType)) {
      setErrorMessage("Choose a valid ID type.");
      return;
    }
    if (!idNumber) {
      setErrorMessage("Enter your ID number.");
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
    if (!(idFile instanceof File) || idFile.size === 0) {
      setErrorMessage("Upload a clear copy of your ID.");
      return;
    }
    if (idFile.size > 10 * 1024 * 1024) {
      setErrorMessage("The ID file must be 10 MB or smaller.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error("Sign in to complete partner signup.");

      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;

      const extension = idFile.name.split(".").pop() ?? "";
      const safeExtension = extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
      const storagePath = `${currentInvitation.provider_id}/partners/${user.id}/id.${safeExtension || "file"}`;
      const { error: uploadError } = await supabase.storage
        .from("legal")
        .upload(storagePath, idFile, { upsert: false, contentType: idFile.type });
      if (uploadError) throw uploadError;

      const { error: partnerError } = await supabase
        .from("provider_patners")
        .insert({
          provider_id: currentInvitation.provider_id,
          user_id: user.id,
          name,
          id_type: idType,
          id_number: idNumber,
        });
      if (partnerError) throw partnerError;

      const { error: invitationError } = await supabase
        .from("provider_invitations")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("entry_id", currentInvitation.entry_id);
      if (invitationError) throw invitationError;

      setSuccessMessage("Your partner details have been submitted.");
      navigate("/provider/dashboard/orders-bookings", { replace: true });
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, "Unable to complete partner signup."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 py-10 sm:px-7 sm:py-14 lg:px-10">
      <div class="mx-auto max-w-180">
        <BrandBanner
          eyebrow="Provider invitation"
          title="Complete partner signup."
          description="Confirm your identity to join the provider workspace."
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
                  <span class="mb-2 block text-sm font-semibold text-dust-grey-100">Legal name</span>
                  <input name="legal_name" class={inputClass} autocomplete="name" required placeholder="Enter your full legal name" />
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-semibold text-dust-grey-100">ID type</span>
                  <select name="id_type" class={inputClass} required>
                    <option value="">Select ID type</option>
                    {idTypes.map((type) => <option value={type}>{type}</option>)}
                  </select>
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-semibold text-dust-grey-100">ID number</span>
                  <input name="id_number" class={inputClass} required placeholder="Enter your ID number" />
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-semibold text-dust-grey-100">Password</span>
                  <span class="relative block">
                    <input
                      name="password"
                      type={showPassword() ? "text" : "password"}
                      class={`${inputClass} pr-12`}
                      autocomplete="new-password"
                      minlength="8"
                      required
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}

                      class="absolute right-3 top-1/2 -translate-y-1/2 text-dust-grey-text"
                    >
                      <Show when={showPassword()} fallback={<Eye size={18} aria-hidden="true" />}>
                        <EyeOff size={18} aria-hidden="true" />
                      </Show>
                    </button>
                  </span>
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-semibold text-dust-grey-100">Confirm password</span>
                  <span class="relative block">
                    <input
                      name="confirm_password"
                      type={showConfirmPassword() ? "text" : "password"}
                      class={`${inputClass} pr-12`}
                      autocomplete="new-password"
                      minlength="8"
                      required
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((visible) => !visible)}

                      class="absolute right-3 top-1/2 -translate-y-1/2 text-dust-grey-text"
                    >
                      <Show when={showConfirmPassword()} fallback={<Eye size={18} aria-hidden="true" />}>
                        <EyeOff size={18} aria-hidden="true" />
                      </Show>
                    </button>
                  </span>
                </label>
                <label class="block rounded-xl border border-dashed border-dust-grey-500 bg-dust-grey-800 p-4 cursor-pointer">
                  <span class="flex items-center gap-3">
                    <span class="flex size-11 items-center justify-center rounded-xl bg-dry-sage-900 text-hunter-green-500">
                      <Upload size={20} aria-hidden="true" />
                    </span>
                    <span>
                      <span class="block text-sm font-semibold text-dust-grey-100">Upload ID document</span>
                      <span class="mt-1 block text-xs text-dust-grey-text">{fileName() || "PDF, PNG, JPG or WEBP up to 10 MB"}</span>
                    </span>
                  </span>
                  <input
                    name="id_file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                    class="sr-only"
                    required
                    onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? "")}
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting()}
                  class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Show when={submitting()} fallback={<><Handshake size={18} aria-hidden="true" /> Complete signup <ArrowRight size={18} aria-hidden="true" /></>}>
                    <LoaderCircle size={18} class="animate-spin" aria-hidden="true" /> Saving details…
                  </Show>
                </button>
                <Show when={successMessage()}>
                  <p role="status" class="text-sm text-fern-text">{successMessage()}</p>
                </Show>
              </form>
            </Show>
          </Show>
        </section>
      </div>
    </main>
  );
}
