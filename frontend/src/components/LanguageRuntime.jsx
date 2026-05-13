import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

const viToEn = {
  "Kênh": "Channel",
  "Báo cáo": "Report",
  "Tỷ giá": "Exchange Rates",
  "Đối tác": "Partner",
  "Nhóm": "Group",
  "Tài khoản": "Account",
  "Trạng thái API": "API Status",
  "Sẵn sàng": "Ready",
  "Đăng xuất": "Logout",
  "Thêm": "Add",
  "Tạo": "Create",
  "Sửa": "Edit",
  "Xóa": "Delete",
  "Lưu": "Save",
  "Hủy": "Cancel",
  "Làm mới": "Refresh",
  "Thao tác": "Action",
  "Tháng": "Month",
  "Mô tả": "Description",
  "Tên group": "Group name",
  "Tên hiển thị group": "Display group name",
  "Mô tả ngắn về group này...": "Short group description...",
  "Chọn partner": "Select partner",
  "Chọn network": "Select network",
  "Chọn file .xlsx hoặc .csv": "Choose .xlsx or .csv file",
  "Xóa import tháng này": "Delete this month import",
  "Chưa có group nào.": "No groups yet.",
  "Chưa có partner nào.": "No partners yet.",
  "Chưa có network nào.": "No networks yet.",
  "Chưa có video. Bấm Sync Video để lấy dữ liệu từ YouTube.": "No videos yet. Click Sync Video to fetch data from YouTube.",
  "Chưa có channel nào": "No channels yet",
  "Hãy nhập Channel ID, YouTube URL hoặc @handle để thêm channel đầu tiên.": "Enter a Channel ID, YouTube URL, or @handle to add the first channel.",
  "Đang đăng nhập:": "Signed in as:",
  "Quyền hiện tại": "Current role",
  "Trạng thái": "Status",
  "Quyền của bạn": "Your permissions",
  "Đăng nhập": "Sign in",
  "Đăng ký": "Register",
  "Đăng ký tài khoản": "Create account",
  "Mật khẩu": "Password",
  "Họ tên": "Full name",
  "Nhập họ tên": "Enter full name",
  "Ít nhất 6 ký tự": "At least 6 characters",
  "Chưa có tài khoản?": "No account yet?",
  "Đã có tài khoản?": "Already have an account?",
  "Đăng ký ngay": "Register now",
  "Admin mặc định:": "Default admin:",
  "Danh sách video": "Video list",
  "View hôm qua": "Yesterday views",
  "View hôm nay": "Today views",
  "Tăng trưởng": "Growth",
  "Mở video": "Open video",
  "Mở channel trên YouTube": "Open channel on YouTube",
  "Xem chi tiết channel": "View channel details",
  "2 video mới nhất": "2 latest videos",
  "Xem": "View",
  "Không có mô tả": "No description",
  "Tạo network và mô tả network để gắn với từng lần import report.": "Create networks and descriptions for report imports.",
  "Thêm, sửa, xóa thông tin đối tác và thanh toán.": "Add, edit, and delete partner and payment information.",
  "Tạo group, chọn partner, cấu hình tier và tính revenue share theo tháng.": "Create groups, choose partners, configure tiers, and calculate monthly revenue share.",
  "Tạo group": "Create group",
  "Thêm tier": "Add tier",
  "Có thể bỏ trống nếu group không dùng tier.": "Leave empty if this group does not use tiers.",
  "Group này chưa dùng tier. Bấm Thêm tier khi cần.": "This group has no tiers. Add one when needed.",
  "Group này không dùng tier. Channel chỉ tính share khi có % riêng.": "This group does not use tiers. Channels only calculate share when a custom percentage is set.",
  "Group này chưa có channel nào.": "This group has no channels yet.",
  "Chọn hoặc tạo group để xem chi tiết.": "Select or create a group to view details.",
  "Tạo tỷ giá": "Create rate",
  "Danh sách tỷ giá": "Exchange rates",
  "Chưa có tỷ giá nào.": "No exchange rates yet.",
  "Mô tả USD > VND": "USD > VND note",
  "Mô tả USD > GBP": "USD > GBP note"
};

const enToVi = Object.fromEntries(Object.entries(viToEn).map(([vi, en]) => [en, vi]));

function withOriginalSpacing(original, translated) {
  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";
  return `${leading}${translated}${trailing}`;
}

function translateString(value, language) {
  const text = String(value || "");
  const key = text.trim();
  if (!key) return value;
  const next = language === "vi" ? enToVi[key] : viToEn[key];
  return next ? withOriginalSpacing(text, next) : value;
}

function translateElement(element, language) {
  for (const attr of ["placeholder", "title", "aria-label"]) {
    if (element.hasAttribute?.(attr)) {
      const value = element.getAttribute(attr);
      const translated = translateString(value, language);
      if (translated !== value) element.setAttribute(attr, translated);
    }
  }
}

function walk(node, language) {
  if (!node) return;
  if (node.nodeType === Node.TEXT_NODE) {
    const translated = translateString(node.nodeValue, language);
    if (translated !== node.nodeValue) node.nodeValue = translated;
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (["SCRIPT", "STYLE", "TEXTAREA"].includes(node.tagName)) return;

  translateElement(node, language);
  node.childNodes.forEach((child) => walk(child, language));
}

export default function LanguageRuntime() {
  const { language } = useI18n();
  const location = useLocation();

  useEffect(() => {
    const apply = () => walk(document.body, language);
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language, location.pathname]);

  return null;
}
