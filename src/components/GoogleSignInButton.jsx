import { createSignal } from "solid-js";
import { supabase } from "~/utils/supabase";

export default function GoogleSignInButton(props) {
  const [errorMessage, setErrorMessage] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);

  async function handleClick() {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to start Google sign-in.",
      );
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={props.disabled || isLoading()}
        class="flex h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-dust-grey-600 bg-white px-5 text-sm font-semibold text-dust-grey-100 transition hover:bg-dust-grey-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" class="size-[18px]">
          <path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303C33.653 32.66 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
          <path fill="#FBBC05" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.344 4.326-17.694 10.691z" />
          <path fill="#34A853" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.119 35.091 26.715 36 24 36c-5.202 0-9.62-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
          <path fill="#EA4335" d="M43.611 20.083H42V20H24v8h11.303a12.01 12.01 0 0 1-4.084 5.57l6.19 5.238C41.09 35.893 44 30.36 44 24c0-1.341-.138-2.65-.389-3.917z" />
        </svg>
        {isLoading() ? "Connecting to Google..." : "Continue with Google"}
      </button>
      {errorMessage() && (
        <p role="alert" class="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage()}
        </p>
      )}
    </>
  );
}
