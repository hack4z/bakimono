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
        class="flex size-10 items-center justify-center rounded-full border border-dust-grey-600 bg-dust-grey-900 text-dust-grey-200 shadow-sm transition hover:border-fern-500 hover:bg-dry-sage-900 hover:text-hunter-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunter-green-500"
      >
        <Download size={18} aria-hidden="true" />
      </button>
    </Show>
  );
}
