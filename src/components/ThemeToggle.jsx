import { createSignal, onCleanup, onMount } from "solid-js";
import { Moon, Sun } from "lucide-solid";

const storageKey = "bakimono-theme";

function applyTheme(isDark) {
  document.documentElement.classList.toggle("dark", isDark);
  window.dispatchEvent(new CustomEvent("bakimono-theme-change", { detail: isDark }));
}

export default function ThemeToggle() {
  const [isDark, setIsDark] = createSignal(false);

  onMount(() => {
    const syncTheme = event => setIsDark(event.detail);
    window.addEventListener("bakimono-theme-change", syncTheme);
    onCleanup(() => window.removeEventListener("bakimono-theme-change", syncTheme));

    const savedTheme = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = savedTheme ? savedTheme === "dark" : prefersDark;

    setIsDark(dark);
    applyTheme(dark);
  });

  function toggleTheme() {
    const dark = !isDark();
    setIsDark(dark);
    applyTheme(dark);
    localStorage.setItem(storageKey, dark ? "dark" : "light");
  }

  return (
    <button
      type="button"
      aria-label={isDark() ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark()}
      title={isDark() ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      class="flex size-10 items-center justify-center rounded-full border border-dust-grey-600 text-dust-grey-200 transition hover:border-fern-500 hover:bg-dry-sage-900 hover:text-hunter-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
    >
      {isDark() ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
