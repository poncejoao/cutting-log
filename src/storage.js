// Substitui o window.storage do artifact do Claude por localStorage real.
// Mantém a mesma interface (get/set/delete/list) pra não precisar mexer no App.jsx.
// localStorage é 100% local ao dispositivo/navegador — funciona offline e não
// depende de conta nenhuma.

const PREFIX = "cutting-log:";

window.storage = {
  async get(key, _shared = false) {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) {
      throw new Error(`key not found: ${key}`);
    }
    return { key, value: raw, shared: false };
  },

  async set(key, value, _shared = false) {
    window.localStorage.setItem(PREFIX + key, value);
    return { key, value, shared: false };
  },

  async delete(key, _shared = false) {
    window.localStorage.removeItem(PREFIX + key);
    return { key, deleted: true, shared: false };
  },

  async list(prefix = "", _shared = false) {
    const full = PREFIX + prefix;
    const keys = Object.keys(window.localStorage)
      .filter((k) => k.startsWith(full))
      .map((k) => k.slice(PREFIX.length));
    return { keys, prefix, shared: false };
  },
};
