import { supabase } from "./supabaseClient.js";

// Chave pública VAPID — não é secreta (o navegador manda ela pro serviço de
// push, tipo um endereço). A chave privada correspondente mora só na função
// `send-reminders` da Supabase, nunca no cliente.
const VAPID_PUBLIC_KEY = "BNebsYE9f1omvpvMh8U23npcRDok-YxUYXW55gR4Rn1OBBk0iUrzFscSziDkXkdXgDNQdSHVAFPJ2_U3oPcKmWI";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getPushPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

// Pede permissão, assina o push no navegador e salva a assinatura na
// Supabase (associada ao usuário logado) — é lá que a função agendada vai
// buscar pra quem mandar os lembretes.
export async function enablePush(userId) {
  if (!isPushSupported()) throw new Error("Esse navegador não suporta notificações push.");
  const registration = await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permissão de notificação negada.");

  let sub = await registration.pushManager.getSubscription();
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });
  if (error) throw error;
  return sub;
}

export async function disablePush(userId) {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

export async function isPushEnabled() {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  return !!sub;
}
