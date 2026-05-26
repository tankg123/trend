import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const ACTION_WORDS = [
  "add",
  "create",
  "edit",
  "delete",
  "remove",
  "save",
  "update",
  "sync",
  "import",
  "export",
  "upload",
  "download",
  "pdf",
  "excel",
  "csv",
  "clear",
  "generate",
  "enable",
  "disable",
  "change password",
  "profile settings",
  "two-factor",
  "2fa",
  "setup",
  "resend",
  "send code",
  "submit",
  "confirm",
  "thêm",
  "tạo",
  "sửa",
  "xóa",
  "xoá",
  "lưu",
  "cập nhật",
  "đồng bộ",
  "nhập",
  "xuất",
  "tải",
  "xóa bảng",
  "xoá bảng"
];

const ALLOW_EXACT = new Set([
  "close",
  "cancel",
  "back",
  "previous",
  "next",
  "view",
  "refresh",
  "reset",
  "filter",
  "filters",
  "sort",
  "copy",
  "copy channel id",
  "open channel in new tab",
  "profile settings",
  "change password",
  "two-factor authentication",
  "generate qr code",
  "enable 2fa",
  "disable 2fa",
  "en",
  "vi",
  "light",
  "dark",
  "logout",
  "sign out",
  "đóng",
  "hủy",
  "huỷ",
  "quay lại",
  "trước",
  "sau",
  "xem",
  "làm mới",
  "lọc",
  "đăng xuất"
]);

const ACTION_ICON_HINTS = [
  "lucide-plus",
  "lucide-trash",
  "lucide-trash-2",
  "lucide-pencil",
  "lucide-pen",
  "lucide-square-pen",
  "lucide-save",
  "lucide-upload",
  "lucide-download",
  "lucide-file-down",
  "lucide-file-up",
  "lucide-refresh-cw",
  "lucide-refresh-ccw",
  "lucide-lock-keyhole",
  "lucide-shield-check"
];

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function labelFor(element) {
  return normalize([
    element.innerText,
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.getAttribute("value")
  ].filter(Boolean).join(" "));
}

function isActionControl(element) {
  if (element.closest("[data-readonly-allow='true']")) return false;

  const label = labelFor(element);
  if (ALLOW_EXACT.has(label)) return false;

  if (element.tagName === "BUTTON" && normalize(element.getAttribute("type")) === "submit") {
    return true;
  }

  if (ACTION_WORDS.some((word) => label.includes(word))) return true;

  const html = normalize(element.innerHTML);
  if (!label && ACTION_ICON_HINTS.some((hint) => html.includes(hint))) return true;
  if (label && ACTION_ICON_HINTS.some((hint) => html.includes(hint)) && !ALLOW_EXACT.has(label)) {
    return ACTION_WORDS.some((word) => label.includes(word));
  }

  if (element.tagName === "A" && element.hasAttribute("download")) return true;
  if (element.tagName === "LABEL" && element.querySelector("input[type='file']")) return true;

  return false;
}

function lockElement(element) {
  if (element.dataset.readonlyLocked === "true") return;
  element.dataset.readonlyLocked = "true";
  element.dataset.readonlyTitle = element.getAttribute("title") || "";

  if ("disabled" in element) {
    element.dataset.readonlyDisabled = element.disabled ? "true" : "false";
    element.disabled = true;
  }

  if (element.tagName === "A" || element.tagName === "LABEL") {
    element.dataset.readonlyTabIndex = element.getAttribute("tabindex") || "";
    element.setAttribute("tabindex", "-1");
    element.setAttribute("aria-disabled", "true");
  }

  element.setAttribute("title", "Read only mode: this action is disabled");
  element.classList.add("read-only-action-disabled");
}

function unlockElement(element) {
  if (element.dataset.readonlyLocked !== "true") return;

  if ("disabled" in element && element.dataset.readonlyDisabled === "false") {
    element.disabled = false;
  }

  if (element.tagName === "A" || element.tagName === "LABEL") {
    if (element.dataset.readonlyTabIndex) {
      element.setAttribute("tabindex", element.dataset.readonlyTabIndex);
    } else {
      element.removeAttribute("tabindex");
    }
    element.removeAttribute("aria-disabled");
  }

  if (element.dataset.readonlyTitle) {
    element.setAttribute("title", element.dataset.readonlyTitle);
  } else {
    element.removeAttribute("title");
  }

  element.classList.remove("read-only-action-disabled");
  delete element.dataset.readonlyLocked;
  delete element.dataset.readonlyDisabled;
  delete element.dataset.readonlyTabIndex;
  delete element.dataset.readonlyTitle;
}

function applyReadOnlyLock() {
  const controls = document.querySelectorAll("button, a, label");
  controls.forEach((element) => {
    if (isActionControl(element)) {
      lockElement(element);
    } else {
      unlockElement(element);
    }
  });
}

function clearReadOnlyLock() {
  document.querySelectorAll("[data-readonly-locked='true']").forEach(unlockElement);
}

export default function ReadOnlyRuntime() {
  const { isReadOnly } = useAuth();

  useEffect(() => {
    if (!isReadOnly) {
      document.body.classList.remove("read-only-mode");
      clearReadOnlyLock();
      return undefined;
    }

    document.body.classList.add("read-only-mode");
    applyReadOnlyLock();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyReadOnlyLock);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "disabled", "aria-label", "title"]
    });

    return () => {
      observer.disconnect();
      document.body.classList.remove("read-only-mode");
      clearReadOnlyLock();
    };
  }, [isReadOnly]);

  return null;
}
