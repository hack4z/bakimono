import { A, useParams } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, Minus, PackageSearch, Plus, QrCode, Smartphone, X } from "lucide-solid";
import BrandBanner from "~/components/BrandBanner";
import GoogleSignInButton from "~/components/GoogleSignInButton";
import LoadingState from "~/components/LoadingState";
import { normalizeKenyanPhone } from "~/utils/supabase";
import { supabase } from "~/utils/supabase-client";
import { getProductCoverUrl } from "~/utils/product-images";
import { checkProfileCompletion, isProfileComplete } from "~/utils/profile-completion";

function formatPrice(price) {
  const amount = Number(price);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Math.round(amount))
    : "KES 0";
}

export default function CheckoutPage() {
  const params = useParams();
  const [product, setProduct] = createSignal(null);
  const [user, setUser] = createSignal(null);
  const [profileComplete, setProfileComplete] = createSignal(false);
  const [phoneDigits, setPhoneDigits] = createSignal("");
  const [quantity, setQuantity] = createSignal(1);
  const [arrivalTime, setArrivalTime] = createSignal("");
  const [paymentMethod, setPaymentMethod] = createSignal("phone");
  const [qrCode, setQrCode] = createSignal("");
  const [showQrPopup, setShowQrPopup] = createSignal(false);
  const [isLoadingSavedPhone, setIsLoadingSavedPhone] = createSignal(false);
  const [savedPhoneMessage, setSavedPhoneMessage] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(true);
  const [isRequestingPayment, setIsRequestingPayment] = createSignal(false);
  const [paymentState, setPaymentState] = createSignal("idle");
  const [paymentMessage, setPaymentMessage] = createSignal("");
  const [paymentError, setPaymentError] = createSignal("");
  const [orderId, setOrderId] = createSignal("");
  const [showPendingPopup, setShowPendingPopup] = createSignal(false);
  const [showSuccessPopup, setShowSuccessPopup] = createSignal(false);
  const [paymentAttempt, setPaymentAttempt] = createSignal(0);
  const [errorMessage, setErrorMessage] = createSignal("");

  async function loadProduct() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [{ data: productData, error: productError }, { data: userData, error: userError }] =
        await Promise.all([
          supabase
            .from("products")
            .select("product_id, provider_id, name, description, price, type, capacity, quantity")
            .eq("product_id", params.productId)
            .maybeSingle(),
          supabase.auth.getUser(),
        ]);

      if (productError) throw productError;
      if (userError) throw userError;
      if (!productData) throw new Error("This product could not be found.");
      setProduct({
        ...productData,
        coverUrl: await getProductCoverUrl(productData.provider_id, productData.product_id),
      });
      setQuantity(Number(productData.quantity) > 0 ? 1 : 0);
      setUser(userData.user);
      if (userData.user) {
        const savedPhone = normalizeKenyanPhone(userData.user.phone ?? userData.user.user_metadata?.phone ?? "");
        setPhoneDigits(savedPhone.startsWith("254") ? savedPhone.slice(3) : "");
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("name, birthday, phone, city, address")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        const completion = await checkProfileCompletion();
        setProfileComplete(isProfileComplete(completion));
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load this product right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function findTransaction({ entryId, checkoutId, startedAt, amount }) {
    if (entryId) {
      const { data, error } = await supabase
        .from("transactions")
        .select("entry_id, status, receipt_number, checkout_id")
        .eq("entry_id", entryId)
        .maybeSingle();
      if (error) throw error;
      return data;
    }

    if (checkoutId) {
      const { data, error } = await supabase
        .from("transactions")
        .select("entry_id, status, receipt_number, checkout_id")
        .eq("checkout_id", checkoutId)
        .maybeSingle();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("entry_id, status, receipt_number, checkout_id")
      .eq("user_id", user().id)
      .eq("product_id", product().product_id)
      .eq("amount", amount)
      .gte("created_at", startedAt)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function useSavedPhone() {
    if (!user() || isLoadingSavedPhone()) return;
    setIsLoadingSavedPhone(true);
    setSavedPhoneMessage("");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", user().id)
        .maybeSingle();
      if (error) throw error;

      const savedPhone = normalizeKenyanPhone(data?.phone ?? "");
      if (!savedPhone) {
        setSavedPhoneMessage("No valid phone number is saved in your profile.");
        return;
      }

      setPhoneDigits(savedPhone.slice(3));
      setSavedPhoneMessage("Your saved phone number has been added.");
    } catch (error) {
      setSavedPhoneMessage(
        error instanceof Error
          ? `We could not load your saved number: ${error.message}`
          : "We could not load your saved number.",
      );
    } finally {
      setIsLoadingSavedPhone(false);
    }
  }

  function cancelQrPayment() {
    setPaymentAttempt((attempt) => attempt + 1);
    setIsRequestingPayment(false);
    setPaymentState("idle");
    setPaymentMessage("");
    setPaymentError("");
    setOrderId("");
    setQrCode("");
    setShowQrPopup(false);
    setPaymentMethod("phone");
  }

  async function waitForPayment({ entryId, checkoutId, startedAt, amount, paymentAttemptId }) {
    for (let pollAttempt = 0; pollAttempt < 24; pollAttempt += 1) {
      if (paymentAttempt() !== paymentAttemptId) return;
      if (pollAttempt > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 5000));
      }

      let data;
      try {
        data = await findTransaction({ entryId, checkoutId, startedAt, amount });
      } catch (error) {
        setPaymentError(
          error instanceof Error
            ? `We sent the payment request, but could not check its status: ${error.message}`
            : "We sent the payment request, but could not check its status.",
        );
        return;
      }

      const status = String(data?.status ?? "").toLowerCase();
      if (["paid", "completed", "complete", "successful", "success"].includes(status)) {
        setPaymentState("paid");
        setShowPendingPopup(false);
        setShowQrPopup(false);
        setShowSuccessPopup(true);
        setPaymentMessage(
          data.receipt_number
            ? `Payment received. Receipt number: ${data.receipt_number}`
            : "Payment received. Your order is confirmed.",
        );
        return;
      }
      if (["failed", "cancelled", "canceled", "rejected"].includes(status)) {
        setPaymentState("failed");
        setShowPendingPopup(false);
        setShowQrPopup(false);
        setPaymentMessage("The payment was not completed. You can try again.");
        return;
      }
    }
    setPaymentMessage("Your payment is still being checked. If you approved it on your phone, you can view the latest status in your orders.");
  }

  async function startPayment(event) {
    event?.preventDefault();
    if (isRequestingPayment() || !user() || !profileComplete() || !product()) return;
    setPaymentError("");
    setPaymentMessage("");

    const normalizedPhone = normalizeKenyanPhone(`254${phoneDigits()}`);
    if (paymentMethod() === "phone" && !normalizedPhone) {
      setPaymentError("Enter a valid Kenyan mobile number.");
      return;
    }
    const availableQuantity = Number(product().quantity);
    const selectedQuantity = quantity();
    if (!Number.isSafeInteger(selectedQuantity) || selectedQuantity < 1 || selectedQuantity > availableQuantity) {
      setPaymentError(`Choose a quantity between 1 and ${availableQuantity}.`);
      return;
    }
    if (availableQuantity < 1) {
      setPaymentError("This product is currently unavailable.");
      return;
    }
    if (!arrivalTime()) {
      setPaymentError("Choose your arrival time.");
      return;
    }
    const unitPrice = Math.round(Number(product().price));
    const amount = unitPrice * selectedQuantity;
    if (!Number.isInteger(unitPrice) || unitPrice < 1 || amount > 150000) {
      setPaymentError("The total must be a whole number between KES 1 and KES 150,000 for M-PESA checkout.");
      return;
    }

    setIsRequestingPayment(true);
    setPaymentState("requesting");
    setQrCode("");
    const startedAt = new Date().toISOString();
    const currentAttempt = paymentAttempt() + 1;
    setPaymentAttempt(currentAttempt);
    try {
      const functionName = paymentMethod() === "qr" ? "mpesa-dynamic-qr" : "mpesa-stk-push";
      const requestBody = paymentMethod() === "qr"
        ? { product_id: product().product_id, quantity: selectedQuantity, arrival_time: arrivalTime() }
        : { product_id: product().product_id, phone: normalizedPhone, quantity: selectedQuantity, arrival_time: arrivalTime() };
      const { data, error } = await supabase.functions.invoke(functionName, { body: requestBody });
      const qrValue = data?.qrCode
        ?? data?.qr_code
        ?? data?.qrCodeUrl
        ?? data?.qr_code_url
        ?? data?.qrImage
        ?? data?.qr_image
        ?? data?.image
        ?? data?.data?.qrCode
        ?? data?.data?.qr_code
        ?? data?.data?.qrCodeUrl
        ?? data?.data?.qr_code_url
        ?? data?.data?.qrImage
        ?? data?.data?.qr_image
        ?? data?.data?.image
        ?? data?.result?.qrCode
        ?? data?.result?.qr_code
        ?? data?.result?.qrCodeUrl
        ?? data?.result?.qr_code_url;
      const normalizedQrValue = typeof qrValue === "string" ? qrValue.trim() : "";
      const qrImage = /^https?:\/\//i.test(normalizedQrValue) || /^data:image\//i.test(normalizedQrValue)
        ? normalizedQrValue
        : /^[A-Za-z0-9+/]+={0,2}$/.test(normalizedQrValue) && normalizedQrValue.length > 100
          ? `data:image/png;base64,${normalizedQrValue}`
          : "";
      const transactionId = data?.transactionId ?? data?.transaction_id;
      const paymentId = data?.paymentId ?? data?.payment_id;
      const transactionEntryId = data?.entryId ?? data?.entry_id ?? transactionId ?? paymentId;
      const checkoutId = data?.checkoutId ?? data?.checkout_id;
      const responseOrderId = data?.orderId ?? data?.order_id;
      const responseMessage = data?.message ?? data?.statusMessage;
      const accepted = Boolean(
        data
          && !data.error
          && (
            data.success === true
            || data.status === "pending"
            || data.status === "initiated"
            || data.status === "awaiting_response"
            || paymentId
            || responseOrderId
            || qrImage
            || responseMessage
          ),
      );

      if (error && !accepted) throw error;
      if (!accepted) {
        throw new Error(data?.error ?? "The payment request could not be started.");
      }
      if (paymentMethod() === "qr" && !qrImage) {
        throw new Error("The QR payment service did not return a QR code. Please try again.");
      }
      setOrderId(responseOrderId ?? "");
      setQrCode(qrImage);
      setShowQrPopup(paymentMethod() === "qr" && Boolean(qrImage));
      setPaymentState("pending");
      setShowPendingPopup(paymentMethod() === "phone");
      setPaymentMessage(
        paymentMethod() === "qr"
          ? "Scan the QR code with your M-PESA app to approve your payment. We’ll confirm it automatically."
          : "We’ve sent a payment request to your phone. Look for the message from M-PESA, then enter your M-PESA PIN to approve the payment.",
      );
      void waitForPayment({
        entryId: transactionEntryId,
        checkoutId,
        startedAt,
        amount,
        paymentAttemptId: currentAttempt,
      });
    } catch (error) {
      setPaymentState("failed");
      setShowPendingPopup(false);
      setShowQrPopup(false);
      setPaymentError(
        error instanceof Error ? error.message : "Unable to start M-PESA payment. Please try again.",
      );
    } finally {
      setIsRequestingPayment(false);
    }
  }

  onMount(loadProduct);

  return (
    <main class="min-h-screen bg-dust-grey-800 px-4 pb-10 pt-7 sm:px-7 sm:pt-10 lg:px-10">
      <div class="mx-auto max-w-4xl">
        <A
          href="/explore"
          class="inline-flex items-center gap-2 text-sm font-semibold text-hunter-green-500 transition hover:text-fern-text"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to explore
        </A>

        <div class="mt-7">
          <BrandBanner
            eyebrow="Your next good thing"
            title="Checkout."
            description="Review your selection before continuing."
          />
        </div>

        <Show when={isLoading()}>
          <LoadingState class="mt-6" label="Loading checkout…" />
        </Show>

        <Show when={!isLoading() && errorMessage()}>
          <div role="alert" class="mt-6 rounded-2xl border border-dust-grey-600 bg-dust-grey-900 px-5 py-10 text-center">
            <h2 class="font-serif text-xl text-dust-grey-100">Unable to continue</h2>
            <p class="mt-2 text-sm text-dust-grey-text">{errorMessage()}</p>
            <A href="/explore" class="mt-4 inline-block text-sm font-semibold text-hunter-green-500 hover:underline">
              Return to explore
            </A>
          </div>
        </Show>

        <Show when={!isLoading() && product()}>
          {(item) => (
            <section class="mt-6 grid overflow-hidden rounded-7 border border-dust-grey-600 bg-dust-grey-900 shadow-sm md:grid-cols-[0.9fr_1.1fr]">
              <div class="relative min-h-64 bg-dry-sage-900 md:min-h-[390px]">
                <Show when={item().coverUrl} fallback={
                  <div class="flex size-full min-h-64 items-center justify-center bg-linear-to-br from-dry-sage-800 via-dry-sage-700 to-pine-teal-700">
                    <PackageSearch size={44} strokeWidth={1.3} class="text-dry-sage-300" aria-hidden="true" />
                  </div>
                }>
                  <img src={item().coverUrl} alt={item().name || ""} class="size-full min-h-64 object-cover md:min-h-[390px]" width="800" height="600" />
                </Show>
              </div>

              <div class="p-5 sm:p-8">
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-fern-text">
                  Order summary
                </p>
                <h2 class="mt-2 font-serif text-2xl tracking-[-0.035em] text-dust-grey-100">
                  {item().name || "Untitled product"}
                </h2>
                <Show when={item().type}>
                  <p class="mt-1 text-sm capitalize text-dust-grey-text">{item().type}</p>
                </Show>
                <Show when={item().capacity}>
                  <p class="mt-3 text-sm text-dust-grey-200">{item().capacity}</p>
                </Show>
                <Show when={item().description}>
                  <p class="mt-4 line-clamp-4 text-sm leading-6 text-dust-grey-200">
                    {item().description}
                  </p>
                </Show>

                <div class="mt-7 border-t border-dust-grey-700 pt-4">
                  <div class="flex items-center justify-between gap-4">
                    <span class="text-sm text-dust-grey-text">Price per item</span>
                    <span class="text-sm font-semibold text-dust-grey-200">
                      {formatPrice(item().price)}
                    </span>
                  </div>
                  <div class="mt-3 flex items-center justify-between gap-4">
                    <label for="checkout-quantity" class="text-sm text-dust-grey-text">Quantity</label>
                    <div class="flex items-center rounded-xl border border-dust-grey-600 bg-dust-grey-900">
                      <button
                        type="button"

                        onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                        disabled={quantity() <= 1 || isRequestingPayment() || paymentState() === "pending"}
                        class="flex size-10 items-center justify-center text-dust-grey-200 transition hover:text-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus size={16} aria-hidden="true" />
                      </button>
                      <input
                        id="checkout-quantity"
                        type="number"
                        min="1"
                        max={Math.max(1, Number(item().quantity))}
                        step="1"
                        value={quantity()}
                        onInput={(event) => {
                          const nextValue = Number(event.currentTarget.value);
                          const max = Number(item().quantity);
                          setQuantity(Number.isSafeInteger(nextValue) ? Math.min(Math.max(nextValue, 1), max) : 1);
                        }}
                        disabled={isRequestingPayment() || paymentState() === "pending" || Number(item().quantity) < 1}
                        class="w-14 border-x border-dust-grey-600 bg-transparent py-2 text-center text-sm font-semibold text-dust-grey-100 outline-none"
                      />
                      <button
                        type="button"

                        onClick={() => setQuantity((value) => Math.min(Number(item().quantity), value + 1))}
                        disabled={quantity() >= Number(item().quantity) || isRequestingPayment() || paymentState() === "pending"}
                        class="flex size-10 items-center justify-center text-dust-grey-200 transition hover:text-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div class="mt-3 flex items-center justify-between gap-4">
                    <span class="text-sm font-semibold text-dust-grey-100">Order total</span>
                    <span class="text-lg font-semibold text-hunter-green-500">
                      {formatPrice(Number(item().price) * quantity())}
                    </span>
                  </div>
                </div>
                <p class="mt-2 text-xs text-dust-grey-text">
                  {Number(item().quantity) > 0
                    ? `${item().quantity} available`
                    : "Currently unavailable"}
                </p>

                <Show
                  when={user()}
                  fallback={
                    isLoading() ? (
                      <LoadingState class="mt-6" label="Checking your account…" />
                    ) : (
                  <div class="mt-6 rounded-2xl border border-dry-sage-700 bg-dry-sage-900 p-4">
                    <p class="flex items-center gap-2 text-sm font-semibold text-dust-grey-100">
                      <LockKeyhole size={16} class="text-hunter-green-500" aria-hidden="true" />
                      Sign in to pay
                    </p>
                    <p class="mt-2 text-xs leading-5 text-dust-grey-text">
                      M-PESA checkout is available to signed-in customers. Continue with Google and you’ll return here.
                    </p>
                    <div class="mt-4">
                      <GoogleSignInButton redirectTo={window.location.href} />
                    </div>
                    <div class="mt-3 flex flex-wrap gap-3 text-sm">
                      <A href="/login" class="font-semibold text-hunter-green-500 hover:text-fern-text">Sign in with email</A>
                      <span class="text-dust-grey-text">or</span>
                      <A href="/signup" class="font-semibold text-hunter-green-500 hover:text-fern-text">Create an account</A>
                    </div>
                  </div>
                    )
                  }
                >
                  <Show when={profileComplete()} fallback={
                    <div role="alert" class="mt-6 rounded-2xl border-2 border-rose-400 bg-rose-50 p-4 text-rose-950 dark:border-rose-400 dark:bg-rose-950/40 dark:text-rose-50">
                      <p class="text-xs font-bold uppercase tracking-[0.16em] text-rose-700 dark:text-rose-200">Checkout locked</p>
                      <h3 class="mt-1 text-lg font-semibold">Complete your signup first</h3>
                      <p class="mt-2 text-sm leading-6 text-rose-800 dark:text-rose-100">
                        Add your name, birthday, phone number, city, and address before placing an order.
                      </p>
                      <A href="/settings" class="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700">
                        Complete profile <ArrowRight size={15} aria-hidden="true" />
                      </A>
                    </div>
                  }>
                  <form onSubmit={startPayment} class="mt-6 rounded-2xl border border-dry-sage-700 bg-dry-sage-900 p-4">
                    <p class="flex items-center gap-2 text-sm font-semibold text-dust-grey-100">
                      <Show when={paymentMethod() === "phone"} fallback={<QrCode size={17} class="text-hunter-green-500" aria-hidden="true" />}>
                        <Smartphone size={17} class="text-hunter-green-500" aria-hidden="true" />
                      </Show>
                      Pay securely with M-PESA
                    </p>
                    <p class="mt-2 text-xs leading-5 text-dust-grey-text">
                      <Show when={paymentMethod() === "phone"} fallback="Scan the QR code using only the M-PESA app or the MySafaricom app to make your payment.">
                        We’ll send a payment request to your phone. A message will appear asking you to enter your M-PESA PIN.
                      </Show>
                    </p>
                    <label class="mt-4 block text-sm font-medium text-dust-grey-100" for="checkout-arrival-time">
                      Arrival time
                      <input
                        id="checkout-arrival-time"
                        name="arrival_time"
                        type="time"
                        required
                        value={arrivalTime()}
                        onInput={(event) => {
                          setArrivalTime(event.currentTarget.value);
                          setPaymentError("");
                        }}
                        disabled={isRequestingPayment() || paymentState() === "pending"}
                        class="mt-2 h-12 w-full rounded-xl border border-dust-grey-600 bg-dust-grey-900 px-4 text-sm text-dust-grey-100 outline-none focus:border-fern-500 focus:ring-2 focus:ring-dry-sage-700 disabled:opacity-60"
                      />
                      <span class="mt-1 block text-xs font-normal text-dust-grey-text">Choose when you expect to arrive.</span>
                    </label>
                    <div class="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-dust-grey-900 p-1">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("phone")}
                        disabled={isRequestingPayment() || paymentState() === "pending"}
                        class={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition ${paymentMethod() === "phone" ? "bg-hunter-green-500 text-white" : "text-dust-grey-text hover:bg-dust-grey-800"}`}
                      >
                        <Smartphone size={14} aria-hidden="true" /> Phone
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("qr")}
                        disabled={isRequestingPayment() || paymentState() === "pending"}
                        class={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition ${paymentMethod() === "qr" ? "bg-hunter-green-500 text-white" : "text-dust-grey-text hover:bg-dust-grey-800"}`}
                      >
                        <QrCode size={14} aria-hidden="true" /> QR code
                      </button>
                    </div>
                    <Show when={paymentMethod() === "phone"}>
                      <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <label for="mpesa-phone" class="block text-sm font-medium text-dust-grey-100">M-PESA phone number</label>
                        <button type="button" onClick={useSavedPhone} disabled={isLoadingSavedPhone() || isRequestingPayment() || paymentState() === "pending"} class="inline-flex items-center gap-1.5 text-xs font-semibold text-hunter-green-400 transition hover:text-fern-400 disabled:cursor-not-allowed disabled:opacity-60">
                          <Show when={isLoadingSavedPhone()} fallback={<Smartphone size={14} aria-hidden="true" />}><LoaderCircle size={14} class="animate-spin" aria-hidden="true" /></Show>
                          {isLoadingSavedPhone() ? "Loading number…" : "Use my saved number"}
                        </button>
                      </div>
                      <div class="mt-2 flex w-full">
                        <span class="inline-flex h-12 items-center rounded-l-xl border border-dust-grey-600 bg-dust-grey-800 px-4 text-sm font-semibold text-dust-grey-200">254</span>
                        <input id="mpesa-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="9" pattern="[17][0-9]{8}" value={phoneDigits()} onInput={(event) => setPhoneDigits(event.currentTarget.value.replace(/\D/g, "").slice(0, 9))} placeholder="712345678" required disabled={isRequestingPayment() || paymentState() === "pending"} class="h-12 min-w-0 flex-1 rounded-r-xl border border-l-0 border-dust-grey-600 bg-dust-grey-900 px-4 text-sm text-dust-grey-100 outline-none placeholder:text-dust-grey-400 focus:border-fern-500 focus:ring-2 focus:ring-dry-sage-700 disabled:opacity-60" />
                      </div>
                      <Show when={savedPhoneMessage()}>
                        <p role="status" class="mt-2 text-xs text-dust-grey-text">{savedPhoneMessage()}</p>
                      </Show>
                    </Show>
                    <Show when={paymentMethod() === "qr"}>
                      <div class="mt-4 rounded-2xl border border-hunter-green-500/30 bg-hunter-green-500/10 px-4 py-3 text-xs leading-5 text-dust-grey-200">
                        <p class="font-semibold text-dust-grey-100">How QR payment works</p>
                        <p class="mt-1">Click the payment button below to generate your QR code. Then scan it using only the M-PESA app or the MySafaricom app.</p>
                      </div>
                    </Show>
                    <Show when={paymentMethod() === "qr" && paymentState() === "requesting"}>
                      <div role="status" aria-live="polite" class="mt-4 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dust-grey-600 bg-white p-5 text-center">
                        <LoaderCircle size={34} class="animate-spin text-hunter-green-500" aria-hidden="true" />
                        <p class="mt-4 text-sm font-semibold text-dust-grey-900">Preparing your payment QR code…</p>
                        <p class="mt-1 text-xs text-dust-grey-600">This will only take a moment.</p>
                      </div>
                    </Show>
                    <Show when={paymentError()}>
                      <p role="alert" class="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">{paymentError()}</p>
                    </Show>
                    <Show when={paymentMessage()}>
                      <p role="status" class={`mt-3 rounded-lg px-3 py-2 text-xs leading-5 ${paymentState() === "paid" ? "bg-fern-900 text-fern-200" : "bg-dust-grey-900 text-dust-grey-200"}`}>
                        <Show when={paymentState() === "requesting"}><LoaderCircle size={14} class="mr-1 inline animate-spin" aria-hidden="true" /></Show>
                        <Show when={paymentState() === "paid"}><CheckCircle2 size={14} class="mr-1 inline" aria-hidden="true" /></Show>
                        {paymentMessage()}
                      </p>
                    </Show>
                    <button
                      type="submit"
                      disabled={isRequestingPayment() || paymentState() === "pending" || paymentState() === "paid" || Number(item().quantity) < 1 || quantity() < 1 || quantity() > Number(item().quantity)}
                      class="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-hunter-green-500 text-sm font-semibold text-white transition hover:bg-hunter-green-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Show when={isRequestingPayment()} fallback={<LockKeyhole size={16} aria-hidden="true" />}>
                        <LoaderCircle size={16} class="animate-spin" aria-hidden="true" />
                      </Show>
                      {isRequestingPayment() ? (paymentMethod() === "qr" ? "Generating QR code…" : "Sending payment request…") : paymentState() === "pending" ? "Waiting for your approval" : paymentState() === "paid" ? "Payment complete" : paymentState() === "failed" ? "Try payment again" : paymentMethod() === "qr" ? "Generate payment QR code" : "Pay with M-PESA"}
                    </button>
                    <Show when={paymentState() === "pending"}>
                      <button
                        type="button"
                        disabled={isRequestingPayment()}
                        onClick={() => void startPayment()}
                        class="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-hunter-green-500 text-sm font-semibold text-hunter-green-500 transition hover:bg-hunter-green-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Retry payment request
                      </button>
                    </Show>
                    <Show when={orderId()}>
                      <p class="mt-3 text-center text-xs text-dust-grey-text">
                        Order created with pending status. <A href="/bookings" class="font-semibold text-hunter-green-500 hover:underline">View your orders</A>
                      </p>
                    </Show>
                    <p class="mt-3 flex items-center justify-center gap-1 text-[11px] text-dust-grey-text">
                      <LockKeyhole size={12} aria-hidden="true" /> Payment details are handled securely by M-PESA.
                    </p>
                  </form>
                  </Show>
                </Show>
              </div>
            </section>
          )}
        </Show>
      </div>
      <Show when={showPendingPopup()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-pine-teal-100/60 px-4 py-6 backdrop-blur-sm"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowPendingPopup(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-pending-title"
            class="relative w-full max-w-md rounded-7 border border-hunter-green-400 bg-dust-grey-900 p-7 text-center shadow-2xl"
          >
            <button
              type="button"

              onClick={() => setShowPendingPopup(false)}
              class="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-dust-grey-text transition hover:bg-dust-grey-800 hover:text-dust-grey-100"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-dry-sage-800 text-hunter-green-400">
              <LoaderCircle size={34} strokeWidth={1.8} class="animate-spin" aria-hidden="true" />
            </div>
            <p class="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-hunter-green-400">Payment waiting</p>
            <h2 id="payment-pending-title" class="mt-2 font-serif text-3xl text-dust-grey-100">
              Check your phone
            </h2>
            <p class="mt-3 text-sm leading-6 text-dust-grey-text">
              <Show when={paymentMethod() === "phone"} fallback="Scan the QR code with your M-PESA app to approve your payment. We’ll confirm it automatically.">
                We sent a payment request to your M-PESA number. Approve it on your phone and enter your PIN. We’ll confirm your payment automatically.
              </Show>
            </p>
            <p class="mt-5 rounded-2xl bg-dry-sage-900 px-4 py-3 text-xs leading-5 text-dust-grey-text">
              This window can be closed while we continue checking your payment.
            </p>
            <button
              type="button"
              onClick={() => setShowPendingPopup(false)}
              class="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-hunter-green-500 px-6 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
            >
              I’m checking my phone
            </button>
          </section>
        </div>
      </Show>
      <Show when={showQrPopup() && qrCode()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-pine-teal-100/60 px-4 py-6 backdrop-blur-sm"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowQrPopup(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-qr-title"
            class="relative w-full max-w-md rounded-7 border border-hunter-green-400 bg-dust-grey-900 p-6 text-center shadow-2xl sm:p-8"
          >
            <button
              type="button"

              onClick={cancelQrPayment}
              class="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-dust-grey-text transition hover:bg-dust-grey-800 hover:text-dust-grey-100"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <div class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-hunter-green-500/10 text-hunter-green-400">
              <QrCode size={25} aria-hidden="true" />
            </div>
            <h2 id="payment-qr-title" class="mt-4 font-serif text-2xl text-dust-grey-100">
              Scan to pay
            </h2>
            <p class="mt-2 text-sm leading-6 text-dust-grey-text">
              Use only the M-PESA app or the MySafaricom app to scan this QR code and complete your payment.
            </p>
            <div class="mt-5 rounded-2xl bg-white p-4">
              <img src={qrCode()} alt="M-PESA payment QR code" class="mx-auto size-64 max-w-full object-contain" width="256" height="256" />
            </div>
            <p class="mt-4 text-xs leading-5 text-dust-grey-text">
              We’ll confirm your payment automatically after it is received.
            </p>
            <div class="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={cancelQrPayment}
                class="inline-flex h-11 items-center justify-center rounded-xl border border-dust-grey-600 px-6 text-sm font-semibold text-dust-grey-200 transition hover:bg-dust-grey-800"
              >
                Cancel payment
              </button>
              <button
                type="button"
                onClick={() => setShowQrPopup(false)}
                class="inline-flex h-11 items-center justify-center rounded-xl bg-hunter-green-500 px-6 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
              >
                Keep waiting
              </button>
            </div>
          </section>
        </div>
      </Show>
      <Show when={showSuccessPopup()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-pine-teal-100/60 px-4 py-6 backdrop-blur-sm"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowSuccessPopup(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-success-title"
            class="relative w-full max-w-md rounded-7 border border-fern-400 bg-dust-grey-900 p-7 text-center shadow-2xl"
          >
            <button
              type="button"

              onClick={() => setShowSuccessPopup(false)}
              class="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-dust-grey-text transition hover:bg-dust-grey-800 hover:text-dust-grey-100"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-fern-900 text-fern-300">
              <CheckCircle2 size={36} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p class="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-fern-400">Payment successful</p>
            <h2 id="payment-success-title" class="mt-2 font-serif text-3xl text-dust-grey-100">
              You’re all set!
            </h2>
            <p class="mt-3 text-sm leading-6 text-dust-grey-text">
              Your payment was received and your order has been confirmed. You can view the details any time in your orders.
            </p>
            <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <A
                href="/bookings"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-hunter-green-500 px-5 text-sm font-semibold text-white transition hover:bg-hunter-green-400"
              >
                View my orders <ArrowRight size={15} aria-hidden="true" />
              </A>
              <button
                type="button"
                onClick={() => setShowSuccessPopup(false)}
                class="inline-flex h-11 items-center justify-center rounded-xl border border-dust-grey-600 px-5 text-sm font-semibold text-dust-grey-200 transition hover:bg-dust-grey-800"
              >
                Stay here
              </button>
            </div>
          </section>
        </div>
      </Show>
    </main>
  );
}
