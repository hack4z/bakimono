import { A } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Trash2 } from "lucide-solid";
import { supabase } from "~/utils/supabase-client";
import { providerStorageBucket } from "~/utils/provider-storage";

const draftKey = "bakimono-provider-signup-draft";
const maxPhotos = 5;
const maxGalleryBytes = 10 * 1024 * 1024;
const supportedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const imageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Unable to read ${file.name}.`));
        return;
      }
      resolve({ name: file.name, type: file.type, data: reader.result });
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export default function ProviderGalleryPage(props) {
  const [photos, setPhotos] = createSignal([]);
  const [draftAvailable, setDraftAvailable] = createSignal(false);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [isSaved, setIsSaved] = createSignal(false);
  const [isSkippedForDevelopment, setIsSkippedForDevelopment] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  onMount(() => {
    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (!savedDraft) return;

      const draft = JSON.parse(savedDraft);
      if (!draft || typeof draft !== "object" || Array.isArray(draft)) return;
      setDraftAvailable(true);
      if (Array.isArray(draft.gallery)) setPhotos(draft.gallery);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to restore your provider signup: ${error.message}`
          : "Unable to restore your provider signup.",
      );
    }
  });

  async function handlePhotoChange(event) {
    const files = [...(event.currentTarget.files ?? [])];
    event.currentTarget.value = "";
    setErrorMessage("");

    if (!files.length) return;
    if (photos().length + files.length > maxPhotos) {
      setErrorMessage(`You can add up to ${maxPhotos} gallery photos.`);
      return;
    }
    if (files.some((file) => !supportedImageTypes.includes(file.type))) {
      setErrorMessage("Choose JPG, PNG, or WebP image files.");
      return;
    }
    if (files.some((file) => file.size === 0)) {
      setErrorMessage("One or more selected files are empty. Choose valid image files.");
      return;
    }
    if (photos().reduce((total, photo) => total + photo.bytes, 0) + files.reduce((total, file) => total + file.size, 0) > maxGalleryBytes) {
      setErrorMessage("Gallery photos must total no more than 10 MB. Choose smaller photos or remove one.");
      return;
    }

    setIsProcessing(true);
    try {
      const newPhotos = await Promise.all(files.map(readImage));
      setPhotos((current) => [
        ...current,
        ...newPhotos.map((photo, index) => ({
          ...photo,
          bytes: files[index].size,
          id: `${files[index].name}-${files[index].lastModified}-${index}`,
        })),
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to read the selected photos.");
    } finally {
      setIsProcessing(false);
    }
  }

  function removePhoto(id) {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
    setErrorMessage("");
  }

  async function persistGallery(skipped = false) {
    if (isSaving()) return;
    setErrorMessage("");
    try {
      const savedDraft = window.sessionStorage.getItem(draftKey);
      if (!savedDraft) {
        setDraftAvailable(false);
        setErrorMessage("Your provider signup draft could not be found. Go back and complete step 1.");
        return;
      }
      const draft = JSON.parse(savedDraft);
      const selectedPhotos = photos();
      if (!skipped && selectedPhotos.length > 0 && (typeof draft.provider_id !== "string" || !draft.provider_id)) {
        setErrorMessage("Your provider record could not be found. Go back and save your business details first.");
        return;
      }
      setIsSaving(true);

      let savedPhotos = selectedPhotos;
      if (!skipped) {
        savedPhotos = [];
        const photosToUpload = selectedPhotos.filter((photo) => !photo.storage_path);
        let nextPhotoNumber = 1;
        if (photosToUpload.length > 0) {
          const folder = `${draft.provider_id}/gallery`;
          const existingFiles = [];
          for (let offset = 0; ; offset += 1000) {
            const { data, error } = await supabase.storage
              .from(providerStorageBucket)
              .list(folder, { limit: 1000, offset });
            if (error) {
              throw new Error(`Unable to check existing gallery photos: ${error.message}`);
            }
            existingFiles.push(...(data ?? []));
            if (!data || data.length < 1000) break;
          }
          const highestPhotoNumber = existingFiles.reduce((highest, file) => {
            const match = /^(\d+)\.(?:jpg|png|webp)$/i.exec(file.name);
            return match ? Math.max(highest, Number(match[1])) : highest;
          }, 0);
          nextPhotoNumber = highestPhotoNumber + 1;
        }

        for (const photo of selectedPhotos) {
          const extension = imageExtensions[photo.type];
          if (!extension) {
            throw new Error(`The image type for "${photo.name}" is not supported.`);
          }
          let storagePath = photo.storage_path;
          if (!storagePath && photo.data) {
            storagePath = `${draft.provider_id}/gallery/${nextPhotoNumber}.${extension}`;
            nextPhotoNumber += 1;
            const imageBlob = await (await fetch(photo.data)).blob();
            const { error } = await supabase.storage
              .from(providerStorageBucket)
              .upload(storagePath, imageBlob, {
                contentType: photo.type,
                upsert: false,
              });
            if (error) {
              throw new Error(`Unable to upload gallery photo "${photo.name}": ${error.message}`);
            }
          } else if (!storagePath) {
            throw new Error(`The image data for "${photo.name}" is unavailable. Please select it again.`);
          }
          savedPhotos.push({ ...photo, storage_path: storagePath });
        }
        const persistedPhotos = savedPhotos.map((photo) => {
          const persistedPhoto = { ...photo };
          delete persistedPhoto.data;
          return persistedPhoto;
        });
        window.sessionStorage.setItem(
          draftKey,
          JSON.stringify({
            ...draft,
            gallery: persistedPhotos,
            ...(skipped ? { developmentBypass: true } : {}),
          }),
        );
      } else {
        const persistedPhotos = savedPhotos.map((photo) => {
          const persistedPhoto = { ...photo };
          delete persistedPhoto.data;
          return persistedPhoto;
        });
        window.sessionStorage.setItem(
          draftKey,
          JSON.stringify({
            ...draft,
            gallery: persistedPhotos,
            developmentBypass: true,
          }),
        );
      }
      setPhotos(savedPhotos);
      setIsSkippedForDevelopment(skipped);
      if (typeof draft.provider_id === "string" && draft.provider_id) {
        const { data, error: stepError } = await supabase
          .from("providers")
          .update({ step: "verification" })
          .eq("provider_id", draft.provider_id)
          .select("provider_id")
          .maybeSingle();
        if (stepError) throw stepError;
        if (!data) throw new Error("The provider record could not be found or you do not have permission to save its onboarding progress.");
      } else {
        throw new Error("Your provider record could not be found. Go back and save your business details first.");
      }
      setIsSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Unable to save your gallery: ${error.message}`
          : "Unable to save your gallery.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main class="min-h-screen bg-dust-grey-900 px-4 pb-10 pt-7 text-dust-grey-100 sm:px-7 sm:pt-10 lg:px-10">
      <div class="mx-auto max-w-4xl">
        <A
          href="#"
          onClick={(event) => {
            event.preventDefault();
            props.onStepChange?.("social");
          }}
          class="inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 transition hover:text-fern-text"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to social links
        </A>

        <header class="mt-7 rounded-7 border border-dry-sage-700 bg-dry-sage-900 p-5 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">Provider onboarding · Step 3 of 5</p>
          <h1 class="mt-2 font-serif text-3xl tracking-[-0.04em] sm:text-4xl">Show customers your space.</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-dust-grey-200">
            Add a few photos of your business, rooms, food, or experiences. This gallery is optional and you can continue without photos.
          </p>
          <div class="mt-6" aria-label="Signup progress">
            <div class="flex items-center justify-between text-xs font-medium text-dust-grey-text">
              <span>Photo gallery</span>
              <span>60%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Provider signup progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="60"
              class="mt-2 h-2 overflow-hidden rounded-full bg-dry-sage-700"
            >
              <div class="h-full w-3/5 rounded-full bg-hunter-green-500" />
            </div>
          </div>
        </header>

        <Show when={!draftAvailable() && !errorMessage()}>
          <section class="mt-6 rounded-7 border border-dust-grey-600 bg-dust-grey-900 p-6 sm:p-8">
            <h2 class="font-serif text-2xl">Complete the previous steps first</h2>
            <p class="mt-2 text-sm leading-6 text-dust-grey-text">
              Save your provider details before adding gallery photos.
            </p>
            <A
              href="#"
              onClick={(event) => {
                event.preventDefault();
                props.onStepChange?.("business");
              }}
              class="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white hover:bg-hunter-green-400"
            >
              Go to business details <ArrowRight size={16} aria-hidden="true" />
            </A>
          </section>
        </Show>

        <Show when={errorMessage()}>
          <p role="alert" class="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage()}
          </p>
        </Show>

        <Show when={draftAvailable()}>
          <Show
            when={!isSaved()}
            fallback={
              <section role="status" class="mt-6 rounded-7 border border-dry-sage-700 bg-dry-sage-900 p-6 sm:p-8">
                <span class="flex size-12 items-center justify-center rounded-2xl bg-hunter-green-500 text-white">
                  <Check size={22} aria-hidden="true" />
                </span>
                <h2 class="mt-4 font-serif text-2xl tracking-[-0.035em]">
                  {isSkippedForDevelopment() ? "Gallery step skipped for development." : "Gallery saved for this session."}
                </h2>
                <p class="mt-2 max-w-2xl text-sm leading-6 text-dust-grey-200">
                  {isSkippedForDevelopment()
                    ? "The gallery was bypassed without requiring photos."
                      : `${photos().length} gallery photo${photos().length === 1 ? "" : "s"} saved and ready for your provider profile.`}
                </p>
                <div class="mt-5 flex flex-wrap gap-5">
                  <button
                    type="button"
                    onClick={() => setIsSaved(false)}
                    class="text-sm font-semibold text-hunter-green-500 hover:underline"
                  >
                    Edit gallery
                  </button>
                  <A
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      props.onStepChange?.("verification");
                    }}
                    class="inline-flex h-11 items-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
                  >
                    Continue to verification <ArrowRight size={16} aria-hidden="true" />
                  </A>
                </div>
              </section>
            }
          >
            <form onSubmit={(event) => { event.preventDefault(); persistGallery(); }} class="mt-6 rounded-7 border border-dust-grey-600 bg-dust-grey-900 p-5 sm:p-8">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 class="font-serif text-2xl tracking-[-0.035em]">Business gallery <span class="text-sm font-sans font-normal text-dust-grey-text">(optional)</span></h2>
                  <p class="mt-1 text-sm text-dust-grey-text">Add up to {maxPhotos} JPG, PNG, or WebP photos.</p>
                </div>
                <label class="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dry-sage-700 px-4 text-sm font-semibold text-hunter-green-500 transition hover:bg-dry-sage-900">
                  <ImagePlus size={17} aria-hidden="true" />
                  {isProcessing() ? "Reading photos…" : "Choose photos"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={isProcessing() || photos().length >= maxPhotos}
                    onChange={handlePhotoChange}
                    class="sr-only"
                  />
                </label>
              </div>

              <Show
                when={photos().length > 0}
                fallback={
                  <div class="mt-6 rounded-2xl border border-dashed border-dust-grey-600 bg-dust-grey-800 px-5 py-10 text-center">
                    <ImagePlus size={26} class="mx-auto text-dust-grey-text" aria-hidden="true" />
                    <p class="mt-3 text-sm font-medium text-dust-grey-200">No gallery photos added</p>
                    <p class="mt-1 text-xs text-dust-grey-text">You can skip this and continue.</p>
                  </div>
                }
              >
                <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <For each={photos()}>
                    {(photo) => (
                      <figure class="relative overflow-hidden rounded-2xl border border-dust-grey-600 bg-dust-grey-800">
                        <img src={photo.data} alt={photo.name} class="aspect-square w-full object-cover" width="800" height="600" />
                        <figcaption class="truncate px-3 py-2 text-xs text-dust-grey-text">{photo.name}</figcaption>
                        <button
                          type="button"
                          aria-label={`Remove ${photo.name}`}
                          onClick={() => removePhoto(photo.id)}
                          class="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-dust-grey-900/90 text-dust-grey-100 shadow transition hover:text-rose-600"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </figure>
                    )}
                  </For>
                </div>
              </Show>

              <p class="mt-4 text-xs leading-5 text-dust-grey-text">
                JPG, PNG, or WebP. Add up to {maxPhotos} photos, with a combined size of up to 10 MB.
              </p>
              <div class="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-dust-grey-700 pt-5 sm:flex-row sm:items-center">
                <p class="text-xs leading-5 text-dust-grey-text">Photos are optional; saving an empty gallery is fine.</p>
                <button
                  type="submit"
                  disabled={isProcessing() || isSaving()}
                  class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-6 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-wait disabled:opacity-60"
                >
                  {isSaving() ? "Uploading photos…" : "Save and continue"} <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </form>
          </Show>
        </Show>
      </div>
    </main>
  );
}
