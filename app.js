"use strict";

const BioLinkConfig = Object.freeze({
  storageKey: "faishal_biolink_links",
  storageVersion: 1,
  sessionKey: "faishal_biolink_admin_session",

  selectors: {
    linkList: "#link-list, .link-list",
    loginForm: "#login-form",
    loginMessage: "#login-message",
    adminLogout: "#admin-logout",
  },

defaultLinks: [
  {
    id: "link-email",
    title: "Kontak Email",
    description: "Kirim pesan atau sampaikan pertanyaan Anda",
    url: "mailto:mfaishalmakarim.id@gmail.com",
    icon: "mail",
    iconUrl:
      "https://img.icons8.com/ios/100/FFFFFF/new-post.png",
    category: "Contact",
    featured: false,
    active: true,
    order: 1,
  },
  {
    id: "link-whatsapp-1",
    title: "WhatsApp",
    description: "Hubungi saya melalui WhatsApp",
    url: "https://wa.me/6282373359760",
    icon: "link",
    iconUrl:
      "https://img.icons8.com/ios/100/FFFFFF/whatsapp--v1.png",
    category: "Contact",
    featured: true,
    active: true,
    order: 2,
  },
  {
    id: "link-youtube",
    title: "YouTube",
    description: "Kunjungi channel YouTube saya",
    url: "https://youtube.com/@arkovale?si=dvGkHIuT5gP0eVla",
    icon: "link",
    iconUrl:
      "https://img.icons8.com/ios/100/FFFFFF/youtube-play.png",
    category: "Social Media",
    featured: false,
    active: true,
    order: 3,
  },
  {
    id: "link-linkedin",
    title: "LinkedIn",
    description: "Terhubung dengan saya di LinkedIn",
    url: "https://www.linkedin.com/in/muhammad-faishal-makarim-5913aa440?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    icon: "link",
    iconUrl:
      "https://img.icons8.com/ios/100/FFFFFF/linkedin.png",
    category: "Social Media",
    featured: false,
    active: true,
    order: 4,
  },
],
});

const BioLinkIcons = Object.freeze({
  behance: `
    <path d="M3 5h8a4 4 0 0 1 0 8H3z"/>
    <path d="M3 13h9a4 4 0 0 1 0 8H3z"/>
    <path d="M15 7h6"/>
    <path d="M14 16h8a4 4 0 0 0-8 0Z"/>
  `,

  github: `
    <path d="M9 19c-5 1.5-5-2.5-7-3"/>
    <path d="M9 22v-3.87a3.37 3.37 0 0 0-.94-2.61"/>
    <path d="M15 22v-3.87a3.37 3.37 0 0 1 .94-2.61"/>
    <path d="M8 16.5c-3.3-.39-6.5-1.58-6.5-7A5.44 5.44 0 0 1 3 5.72"/>
    <path d="M3 5.72A5.07 5.07 0 0 1 3.1 2S4.3 1.65 7 3.48a13.38 13.38 0 0 1 7 0C16.7 1.65 17.9 2 17.9 2A5.07 5.07 0 0 1 18 5.72a5.44 5.44 0 0 1 1.5 3.78"/>
  `,

  linkedin: `
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z"/>
    <path d="M2 9h4v12H2z"/>
    <circle cx="4" cy="4" r="2"/>
  `,

  mail: `
    <rect x="3" y="5" width="18" height="14" rx="3"/>
    <path d="m4 7 8 6 8-6"/>
  `,

  link: `
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71"/>
  `,

  palette: `
    <circle cx="12" cy="12" r="10"/>
    <circle cx="7.5" cy="10" r="1"/>
    <circle cx="12" cy="6.5" r="1"/>
    <circle cx="16.5" cy="10" r="1"/>
    <path d="M12 22v-4a2 2 0 0 1 2-2h1a2 2 0 0 0 0-4h-1"/>
  `,
});

let memoryLinks = null;
let storageAvailable = true;

function generateLinkId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    "link-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10)
  );
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value, defaultValue = false) {
  return typeof value === "boolean" ? value : defaultValue;
}

function normalizeOrder(value, defaultValue = 0) {
  const number = Number(value);

  if (!Number.isSafeInteger(number) || number < 0) {
    return defaultValue;
  }

  return number;
}

const ADMIN_CREDENTIALS = Object.freeze({
  username: "BioLinkFayz",
  password: "BioLinkFayz@1354",
});

function initializeLoginForm() {
  const loginForm = document.querySelector("#login-form");

  if (!loginForm) {
    return;
  }

  const usernameInput = document.querySelector("#username");
  const passwordInput = document.querySelector("#password");
  const loginMessage = document.querySelector("#login-message");
  const submitButton = document.querySelector("#login-submit");
  const togglePassword = document.querySelector("#toggle-password");

  // Fitur tampilkan/sembunyikan password.
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
      const isPasswordHidden = passwordInput.type === "password";

      passwordInput.type = isPasswordHidden ? "text" : "password";
      togglePassword.textContent = isPasswordHidden
        ? "Sembunyikan"
        : "Tampilkan";

      togglePassword.setAttribute("aria-pressed", String(isPasswordHidden));

      togglePassword.setAttribute(
        "aria-label",
        isPasswordHidden ? "Sembunyikan password" : "Tampilkan password",
      );
    });
  }

  if (isAdminLoggedIn()) {
    window.location.replace("./admin.html");
    return;
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (loginMessage) {
      loginMessage.hidden = true;
      loginMessage.textContent = "";
    }

    if (submitButton) {
      submitButton.disabled = true;
    }

    if (
      username !== ADMIN_CREDENTIALS.username ||
      password !== ADMIN_CREDENTIALS.password
    ) {
      if (loginMessage) {
        loginMessage.textContent =
          "Nama Pengguna atau Kata Sandi yang Fayz masukkan salah.";
        loginMessage.hidden = false;
      }

      if (submitButton) {
        submitButton.disabled = false;
      }

      passwordInput.focus();
      return;
    }

    const sessionStarted = startAdminSession();

    if (!sessionStarted) {
      if (loginMessage) {
        loginMessage.textContent =
          "Sesi login gagal dibuat. Periksa pengaturan browser Anda.";
        loginMessage.hidden = false;
      }

      if (submitButton) {
        submitButton.disabled = false;
      }

      return;
    }

    window.location.assign("./admin.html");
  });
}

function validateLinkUrl(value) {
  const urlValue = normalizeText(value);

  if (!urlValue) {
    return {
      valid: false,
      message: "URL tautan wajib diisi.",
    };
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(urlValue);
  } catch {
    return {
      valid: false,
      message: "Masukkan URL yang valid dan lengkap.",
    };
  }

  const allowedProtocols = ["http:", "https:", "mailto:"];

  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    return {
      valid: false,
      message: "Protokol URL tersebut tidak diperbolehkan.",
    };
  }

  if (
    (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") &&
    !parsedUrl.hostname
  ) {
    return {
      valid: false,
      message: "URL harus memiliki nama domain.",
    };
  }

  return {
    valid: true,
    value: parsedUrl.href,
    message: "",
  };
}

function validateLink(input, options = {}) {
  const source =
    input && typeof input === "object" && !Array.isArray(input) ? input : {};

  const existingId = options.existingId || "";

  const title = normalizeText(source.title);
  const description = normalizeText(source.description);
  const category = normalizeText(source.category);
  const icon = normalizeText(source.icon) || "link";

  if (!title) {
    throw new Error("Nama tautan wajib diisi.");
  }

  if (title.length > 100) {
    throw new Error("Nama tautan maksimal 100 karakter.");
  }

  if (description.length > 250) {
    throw new Error("Deskripsi maksimal 250 karakter.");
  }

  if (category.length > 50) {
    throw new Error("Kategori maksimal 50 karakter.");
  }

  const urlResult = validateLinkUrl(source.url);

  if (!urlResult.valid) {
    throw new Error(urlResult.message);
  }

  if (!Object.hasOwn(BioLinkIcons, icon)) {
    throw new Error("Ikon yang dipilih tidak tersedia.");
  }


const iconUrl = normalizeText(source.iconUrl);

if (iconUrl) {
  let parsedIconUrl;

  try {
    parsedIconUrl = new URL(iconUrl);
  } catch {
    throw new Error("URL gambar ikon tidak valid.");
  }

  if (!["http:", "https:"].includes(parsedIconUrl.protocol)) {
    throw new Error("URL gambar ikon harus menggunakan HTTP atau HTTPS.");
  }
}

return {
  id: existingId || generateLinkId(),
  title,
  description,
  url: urlResult.value,
  icon,
  iconUrl,
  category,
  featured: normalizeBoolean(source.featured),
  active: normalizeBoolean(source.active, true),
  order: normalizeOrder(source.order),
};

}

function readStoredData() {
  try {
    const rawData = localStorage.getItem(BioLinkConfig.storageKey);

    if (rawData === null) {
      return null;
    }

    const parsed = JSON.parse(rawData);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== BioLinkConfig.storageVersion ||
      !Array.isArray(parsed.links)
    ) {
      console.error("[BioLink] Format data penyimpanan tidak dikenali.");

      return null;
    }

    return parsed.links;
  } catch (error) {
    storageAvailable = false;

    console.error("[BioLink] Gagal membaca localStorage:", error);

    return null;
  }
}

function writeStoredData(links) {
  const payload = {
    version: BioLinkConfig.storageVersion,
    links,
  };

  try {
    localStorage.setItem(BioLinkConfig.storageKey, JSON.stringify(payload));

    storageAvailable = true;
    memoryLinks = links;

    return true;
  } catch (error) {
    storageAvailable = false;

    console.error("[BioLink] Gagal menyimpan data:", error);

    throw new Error(
      "Data tidak dapat disimpan. Periksa pengaturan penyimpanan browser.",
    );
  }
}

function initializeStorage() {
  try {
    const existing = localStorage.getItem(BioLinkConfig.storageKey);

    if (existing !== null) {
      return;
    }

    const initialLinks = BioLinkConfig.defaultLinks.map((link) => ({
      ...link,
    }));

    writeStoredData(initialLinks);
  } catch (error) {
    storageAvailable = false;

    if (memoryLinks === null) {
      memoryLinks = BioLinkConfig.defaultLinks.map((link) => ({ ...link }));
    }

    console.warn("[BioLink] Menggunakan penyimpanan sementara:", error);
  }
}

function getAllLinks() {
  if (memoryLinks === null) {
    initializeStorage();
  }

  const stored = readStoredData();

  const source =
    stored !== null ? stored : (memoryLinks ?? BioLinkConfig.defaultLinks);

  return source.map((link) => ({ ...link })).sort((a, b) => a.order - b.order);
}

function getLinkById(id) {
  return getAllLinks().find((link) => link.id === id) || null;
}

function getPublicLinks() {
  return getAllLinks().filter((link) => link.active === true);
}

function addLink(input) {
  const links = getAllLinks();

  const nextOrder =
    links.length > 0 ? Math.max(...links.map((link) => link.order)) + 1 : 1;

  const newLink = validateLink({
    ...input,
    order: input?.order ?? nextOrder,
  });

  if (links.some((link) => link.id === newLink.id)) {
    throw new Error("ID tautan sudah digunakan.");
  }

  const updatedLinks = [...links, newLink];

  writeStoredData(updatedLinks);
  renderPublicLinks();

  return { ...newLink };
}

function updateLink(id, changes) {
  const links = getAllLinks();

  const index = links.findIndex((link) => link.id === id);

  if (index === -1) {
    throw new Error("Tautan yang ingin diperbarui tidak ditemukan.");
  }

  const current = links[index];

  const updatedLink = validateLink(
    {
      ...current,
      ...changes,
      id: current.id,
    },
    {
      existingId: current.id,
    },
  );

  const updatedLinks = links.map((link, linkIndex) =>
    linkIndex === index ? updatedLink : link,
  );

  writeStoredData(updatedLinks);
  renderPublicLinks();

  return { ...updatedLink };
}

function deleteLink(id) {
  const links = getAllLinks();

  const exists = links.some((link) => link.id === id);

  if (!exists) {
    throw new Error("Tautan yang ingin dihapus tidak ditemukan.");
  }

  const updatedLinks = links.filter((link) => link.id !== id);

  writeStoredData(updatedLinks);
  renderPublicLinks();

  return true;
}

function reorderLinks(orderedIds) {
  if (!Array.isArray(orderedIds)) {
    throw new Error("Daftar urutan harus berupa array ID.");
  }

  const links = getAllLinks();
  const knownIds = new Set(links.map((link) => link.id));
  const requestedIds = new Set();

  for (const id of orderedIds) {
    if (!knownIds.has(id)) {
      throw new Error("Terdapat ID tautan yang tidak dikenal.");
    }

    if (requestedIds.has(id)) {
      throw new Error("ID tautan tidak boleh berulang.");
    }

    requestedIds.add(id);
  }

  const requestedLinks = orderedIds.map((id) =>
    links.find((link) => link.id === id),
  );

  const remainingLinks = links.filter((link) => !requestedIds.has(link.id));

  const updatedLinks = [...requestedLinks, ...remainingLinks].map(
    (link, index) => ({
      ...link,
      order: index + 1,
    }),
  );

  writeStoredData(updatedLinks);
  renderPublicLinks();

  return getAllLinks();
}

function createElement(tag, className, text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== "") {
    element.textContent = text;
  }

  return element;
}

function createIcon(iconName, iconUrl = "") {
  if (typeof iconUrl === "string" && iconUrl.trim() !== "") {
    const img = document.createElement("img");

    img.src = iconUrl.trim();
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.loading = "lazy";
    img.decoding = "async";

    img.addEventListener("error", () => {
      img.replaceWith(createIcon(iconName, ""));
    }, { once: true });

    return img;
  }

  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );

  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const safeIcon = Object.hasOwn(BioLinkIcons, iconName)
    ? iconName
    : "link";

  const template = document.createElement("template");
  template.innerHTML = BioLinkIcons[safeIcon].trim();

  svg.appendChild(template.content.cloneNode(true));

  return svg;
}

function createLinkCard(link) {
  const anchor = createElement(
    "a",
    link.featured ? "link-card featured-link" : "link-card",
  );

  anchor.href = link.url;

  if (link.url.startsWith("http://") || link.url.startsWith("https://")) {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }

  const iconWrapper = createElement("span", "link-icon");

  iconWrapper.appendChild(createIcon(link.icon, link.iconUrl));

  const content = createElement("span", "link-content");

  content.appendChild(createElement("strong", "", link.title));

  if (link.description) {
    content.appendChild(createElement("small", "", link.description));
  }

  const arrow = createElement("span", "link-arrow", "↗");

  arrow.setAttribute("aria-hidden", "true");

  anchor.append(iconWrapper, content, arrow);

  return anchor;
}

function renderPublicLinks() {
  if (typeof document === "undefined") {
    return;
  }

  const container = document.querySelector(BioLinkConfig.selectors.linkList);

  if (!container) {
    return;
  }

  const publicLinks = getPublicLinks();

  const fragment = document.createDocumentFragment();

  for (const link of publicLinks) {
    try {
      fragment.appendChild(createLinkCard(link));
    } catch (error) {
      console.error("[BioLink] Gagal merender tautan:", link.id, error);
    }
  }

  container.replaceChildren(fragment);

  updatePublicLinkCount(publicLinks.length);
}

function updatePublicLinkCount(count) {
  const countElement = document.querySelector(".link-count");

  if (!countElement) {
    return;
  }

  countElement.textContent = String(count).padStart(2, "0") + " Tautan";
}

function isAdminLoggedIn() {
  try {
    return sessionStorage.getItem(BioLinkConfig.sessionKey) === "true";
  } catch (error) {
    console.warn("[BioLink] Status sesi tidak dapat dibaca:", error);

    return false;
  }
}

function startAdminSession() {
  try {
    sessionStorage.setItem(BioLinkConfig.sessionKey, "true");

    return true;
  } catch (error) {
    console.error("[BioLink] Gagal memulai sesi:", error);

    return false;
  }
}

function endAdminSession() {
  try {
    sessionStorage.removeItem(BioLinkConfig.sessionKey);

    return true;
  } catch (error) {
    console.error("[BioLink] Gagal mengakhiri sesi:", error);

    return false;
  }
}

function initializeLogoutButton() {
  const logoutButton = document.querySelector(
    BioLinkConfig.selectors.adminLogout,
  );

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", () => {
    endAdminSession();
    window.location.replace("login.html");
  });
}

function initializeBioLink() {
  initializeStorage();
  renderPublicLinks();
  initializeLoginForm();
  initializeLogoutButton();

  console.info("[BioLink] Application initialized.");
}

window.BioLink = Object.freeze({
  getAllLinks,
  getPublicLinks,
  getLinkById,

  addLink,
  updateLink,
  deleteLink,
  reorderLinks,

  validateLink,
  validateLinkUrl,

  renderPublicLinks,

  isAdminLoggedIn,
  startAdminSession,
  endAdminSession,

  getStorageStatus() {
    return {
      available: storageAvailable,
      key: BioLinkConfig.storageKey,
      version: BioLinkConfig.storageVersion,
    };
  },
});

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeBioLink, {
      once: true,
    });
  } else {
    initializeBioLink();
  }
}
