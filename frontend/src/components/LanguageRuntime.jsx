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
  "Mô tả USD > GBP": "USD > GBP note",
  "Tổng quan": "Overview",
  "Chi phí": "Expense",
  "Tổng quan chi phí": "Expense Overview",
  "Số dư tài khoản, chi tiêu, doanh thu và công nợ chờ hoàn trả.": "Account balances, spending, revenue, and pending reimbursements.",
  "Nhóm chi tiêu": "Expense Groups",
  "Giao dịch": "Transactions",
  "Doanh thu": "Revenue",
  "Tên tài khoản": "Account name",
  "Số tài khoản": "Account number",
  "Loại tài khoản": "Account type",
  "Chủ sở hữu": "Owner",
  "Loại tiền": "Currency",
  "Loại doanh thu": "Revenue type",
  "Tên nhóm": "Group name",
  "Số tiền": "Amount",
  "Số dư": "Balance",
  "Chi tháng này": "Month expense",
  "Thu tháng này": "Month revenue",
  "Công nợ chờ hoàn trả": "Pending debts",
  "Nhóm chi tiêu cao nhất": "Top categories",
  "Không có công nợ.": "No pending debt.",
  "Chưa có dữ liệu nhóm.": "No category data.",
  "Chưa có dữ liệu tài khoản.": "No account data yet.",
  "Thêm tài khoản": "Add account",
  "Sửa tài khoản": "Edit account",
  "Thêm nhóm chi tiêu": "Add expense group",
  "Sửa nhóm chi tiêu": "Edit expense group",
  "Thêm giao dịch": "Add transaction",
  "Sửa giao dịch": "Edit transaction",
  "Thêm doanh thu": "Add revenue",
  "Sửa doanh thu": "Edit revenue",
  "Hình / file hóa đơn": "Receipt image / file",
  "Tải lên hoặc chụp hóa đơn": "Upload or take a receipt photo",
  "Trạng thái công nợ": "Debt status",
  "Nhà cung cấp": "Vendor",
  "Ghi chú": "Note",
  "Người thao tác": "By",
  "Ngày": "Date",
  "Không có nhóm": "No category",
  "Không công nợ": "No debt",
  "Chờ hoàn trả": "Pending reimbursement",
  "Đã hoàn trả": "Paid back",
  "Tự động": "Auto",
  "Công ty": "Company",
  "Cá nhân": "Personal",
  "Bên ngoài": "External",
  "Ngôn ngữ": "Language",
  "Giao diện": "Theme",
  "Sáng": "Light",
  "Tối": "Dark",
  "Cài đặt hồ sơ": "Profile settings",
  "Đổi mật khẩu": "Change password",
  "Xác thực hai lớp": "Two-factor authentication",
  "Quản lý kênh": "Channel Management",
  "Bảng điều khiển": "Dashboard",
  "Mạng": "Network",
  "Bảng điều khiển báo cáo": "Report dashboard",
  "Doanh thu, thanh toán, lợi nhuận, đối tác và trạng thái kênh.": "Revenue, payouts, profit, partners, and channel health.",
  "Tổng doanh thu toàn bộ": "Total Revenue Full",
  "Tổng đã thanh toán toàn bộ": "Total Paid Full",
  "Tổng lợi nhuận toàn bộ": "Total Profit Full",
  "Doanh thu tháng": "Month Revenue",
  "Đã thanh toán tháng": "Month Paid",
  "Lợi nhuận tháng": "Month Profit",
  "Tổng đối tác": "Total Partners",
  "Tổng số kênh": "Total Channels",
  "Kênh đang hoạt động": "Live Channels",
  "Kênh lỗi / die": "Die / Error Channels",
  "Toàn bộ doanh thu đã import": "All imported revenue",
  "Phải trả sau phí": "Payable after fees",
  "Doanh thu trừ đã thanh toán": "Revenue minus paid",
  "Phí": "Fee",
  "Đã thanh toán": "Paid",
  "kênh": "channels",
  "Top 10 đối tác theo doanh thu": "Top 10 Partners By Revenue",
  "Top 10 kênh theo doanh thu": "Top 10 Channels By Revenue",
  "Tháng này chưa có doanh thu kênh.": "No channel revenue for this month.",
  "Ngân hàng": "bank",
  "Tiền mặt": "cash",
  "Ví điện tử": "wallet",
  "Thẻ": "card",
  "Khác": "other",
  "Cài đặt Content ID": "Content ID Settings",
  "Cộng tác viên": "Collaborators",
  "Chia sẻ": "Sharing",
  "Người tạo": "Created by",
  "Người cập nhật": "Updated by",
  "Thêm đối tác": "Add partner",
  "Không có tên hiển thị": "No display name",
  "Liên hệ": "Contact",
  "Điện thoại": "Phone",
  "Email đối soát": "Counter",
  "Địa chỉ": "Address"
};

const enToVi = {
  ...Object.fromEntries(Object.entries(viToEn).map(([vi, en]) => [en, vi])),
  Accounts: "Tài khoản",
  Actions: "Thao tác",
  Category: "Nhóm",
  Categories: "Nhóm",
  Groups: "Nhóm",
  "Created by": "Người tạo",
  "Updated by": "Người cập nhật"
  ,
  Theme: "Giao diện",
  Light: "Sáng",
  Dark: "Tối",
  "Profile settings": "Cài đặt hồ sơ",
  "Change password": "Đổi mật khẩu",
  "Two-factor authentication": "Xác thực hai lớp",
  "Channel Management": "Quản lý kênh",
  Dashboard: "Bảng điều khiển",
  Network: "Mạng",
  "Report dashboard": "Bảng điều khiển báo cáo",
  "Revenue, payouts, profit, partners, and channel health.": "Doanh thu, thanh toán, lợi nhuận, đối tác và trạng thái kênh.",
  "Total Revenue Full": "Tổng doanh thu toàn bộ",
  "Total Paid Full": "Tổng đã thanh toán toàn bộ",
  "Total Profit Full": "Tổng lợi nhuận toàn bộ",
  "Month Revenue": "Doanh thu tháng",
  "Month Paid": "Đã thanh toán tháng",
  "Month Profit": "Lợi nhuận tháng",
  "Total Partners": "Tổng đối tác",
  "Total Channels": "Tổng số kênh",
  "Live Channels": "Kênh đang hoạt động",
  "Die / Error Channels": "Kênh lỗi / die",
  "All imported revenue": "Toàn bộ doanh thu đã import",
  "Payable after fees": "Phải trả sau phí",
  "Revenue minus paid": "Doanh thu trừ đã thanh toán",
  Fee: "Phí",
  Paid: "Đã thanh toán",
  channels: "kênh",
  "Top 10 Partners By Revenue": "Top 10 đối tác theo doanh thu",
  "Top 10 Channels By Revenue": "Top 10 kênh theo doanh thu",
  "No channel revenue for this month.": "Tháng này chưa có doanh thu kênh.",
  company: "Công ty",
  bank: "Ngân hàng",
  cash: "Tiền mặt",
  wallet: "Ví điện tử",
  card: "Thẻ",
  other: "Khác",
  "Add partner": "Thêm đối tác",
  "No display name": "Không có tên hiển thị",
  Contact: "Liên hệ",
  Phone: "Điện thoại",
  Counter: "Email đối soát",
  Address: "Địa chỉ",
  Bank: "Ngân hàng",
  Account: "Tài khoản"
};

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
  if (next) return withOriginalSpacing(text, next);

  if (language === "vi") {
    const dynamic = key
      .replace(/^Fee:/, "Phí:")
      .replace(/^Paid\s+/, "Đã thanh toán ")
      .replace(/^Phone:/, "Điện thoại:")
      .replace(/^Contact:/, "Liên hệ:")
      .replace(/^Counter:/, "Email đối soát:")
      .replace(/^Address:/, "Địa chỉ:")
      .replace(/^Bank:/, "Ngân hàng:")
      .replace(/^Account:/, "Tài khoản:")
      .replace(/\bchannels\b/g, "kênh");
    return dynamic !== key ? withOriginalSpacing(text, dynamic) : value;
  }

  const dynamic = key
    .replace(/^Phí:/, "Fee:")
    .replace(/^Đã thanh toán\s+/, "Paid ")
    .replace(/^Điện thoại:/, "Phone:")
    .replace(/^Liên hệ:/, "Contact:")
    .replace(/^Email đối soát:/, "Counter:")
    .replace(/^Địa chỉ:/, "Address:")
    .replace(/^Ngân hàng:/, "Bank:")
    .replace(/^Tài khoản:/, "Account:")
    .replace(/\bkênh\b/g, "channels");
  return dynamic !== key ? withOriginalSpacing(text, dynamic) : value;
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
