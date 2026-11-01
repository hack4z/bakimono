import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { Download } from "lucide-solid";

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = createSignal(null);
  const [isStandalone, setIsStandalone] = createSignal(false);

  onMount(() => {
    const syncStandalone = () =>
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    const handlePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    syncStandalone();
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);

    onCleanup(() => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    });
  });

  async function installApp() {
    const prompt = installPrompt();
    if (!prompt) {
      window.alert("Use your browser menu and choose Install app or Add to Home Screen.");
      return;
    }
    await prompt.prompt();
    await prompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <Show when={!isStandalone()}>
      <button
        type="button"
        onClick={installApp}
        title="Install Bakimono app"
        class="group relative flex h-11 items-center gap-2 overflow-hidden rounded-full border border-hunter-green-400 bg-hunter-green-500 px-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(52,78,65,0.28)] transition duration-200 hover:-translate-y-0.5 hover:border-hunter-green-300 hover:bg-hunter-green-400 hover:shadow-[0_14px_34px_rgba(52,78,65,0.36)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500 sm:px-4"
      >
        <span class="absolute inset-y-0 left-[-60%] w-1/2 -skew-x-12 bg-white/20 transition-transform duration-500 group-hover:translate-x-[340%]" aria-hidden="true" />
        <span class="flex size-7 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
          <Download size={16} strokeWidth={2.25} aria-hidden="true" />
        </span>
        <span>Install app</span>
      </button>
    </Show>
  );
}
