import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Loader2, Mail, Save, Search, Send, Trash2, UserPlus, X } from "lucide-react";
import api from "../api/api";

const defaultSettings = {
  email_notification_subject: "Please check report revenue month {month}",
  email_notification_body: [
    "Please review the revenue report for {month} and complete the next steps so our company can proceed with payment.",
    "",
    "Please ignore this email if you have already completed it.",
    "",
    "Thank you."
  ].join("\n"),
  email_notification_signature: "ANS Network"
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function defaultScheduleDate() {
  const next = new Date(Date.now() + 60 * 60 * 1000);
  next.setMinutes(0, 0, 0);
  return next.toISOString().slice(0, 16);
}

function monthLabel(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return month || "";
  const [year, value] = month.split("-");
  return `${value}/${year}`;
}

function tokenText(text, partnerName, month) {
  return String(text || "")
    .replaceAll("{month}", monthLabel(month))
    .replaceAll("{partner}", partnerName || "Partner")
    .replaceAll("{company}", "ANS Network");
}

function dateTimeText(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function EmailNotificationPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [partners, setPartners] = useState([]);
  const [logs, setLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [month, setMonth] = useState(currentMonth());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState("");
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [sendMode, setSendMode] = useState("now");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleDate());
  const [followUpDays, setFollowUpDays] = useState(0);

  const selectedPartners = useMemo(
    () => partners.filter((partner) => selectedIds.includes(partner.id)),
    [partners, selectedIds]
  );

  const filteredPartners = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return partners;
    return partners.filter((partner) => {
      return [partner.partner_name, partner.display_name, partner.email]
        .some((value) => String(value || "").toLowerCase().includes(keyword));
    });
  }, [partners, query]);

  const previewPartner = selectedPartners[0] || partners[0] || {};
  const previewName = previewPartner.display_name || previewPartner.partner_name || "Partner";
  const previewSubject = tokenText(settings.email_notification_subject, previewName, month);
  const previewBody = tokenText(settings.email_notification_body, previewName, month);
  const previewSignature = tokenText(settings.email_notification_signature, previewName, month);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api.get("/email/notification");
      setSettings({ ...defaultSettings, ...(res.data.settings || {}) });
      setPartners(res.data.partners || []);
      setLogs(res.data.logs || []);
      setSchedules(res.data.schedules || []);
      setSmtpEnabled(Boolean(res.data.smtp_enabled));
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not load email notification data");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      const res = await api.put("/email/notification", settings);
      setSettings({ ...defaultSettings, ...(res.data.settings || {}) });
      setMessage("Email template saved");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not save email template");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function sendNotification() {
    if (!selectedIds.length) {
      setMessage("Please add at least one recipient");
      return;
    }
    try {
      setSending(true);
      await saveSettings();
      const res = await api.post("/email/notification/send", {
        month,
        partner_ids: selectedIds
      });
      const data = res.data.data || {};
      setMessage(`Email sent: ${data.sent || 0} successful, ${data.failed || 0} failed.`);
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not send email notification");
    } finally {
      setSending(false);
    }
  }

  async function createSchedule() {
    if (!selectedIds.length) {
      setMessage("Please add at least one recipient");
      return;
    }
    if (!scheduledAt) {
      setMessage("Please choose schedule date and time");
      return;
    }

    try {
      setScheduling(true);
      await saveSettings();
      const res = await api.post("/email/notification/schedules", {
        month,
        partner_ids: selectedIds,
        send_at: new Date(scheduledAt).toISOString(),
        follow_up_days: Number(followUpDays) || 0,
        subject: settings.email_notification_subject,
        body: settings.email_notification_body,
        signature: settings.email_notification_signature
      });
      setSchedules(res.data.schedules || []);
      setMessage("Email schedule created");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not create email schedule");
    } finally {
      setScheduling(false);
    }
  }

  async function deleteSchedule(id) {
    try {
      const res = await api.delete(`/email/notification/schedules/${id}`);
      setSchedules(res.data.schedules || []);
      setMessage("Email schedule deleted");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not delete email schedule");
    }
  }

  function togglePartner(id) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={42} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
              <Mail size={17} />
              Email
            </div>
            <h1 className="text-3xl font-black text-slate-950 lg:text-4xl">Email Notification</h1>
            <p className="mt-2 max-w-3xl text-slate-500">Set up professional revenue emails, send immediately, or schedule automatic follow-ups.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={saveSettings} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save template
            </button>
            <button type="button" onClick={sendMode === "now" ? sendNotification : createSchedule} disabled={sending || scheduling || !smtpEnabled} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 disabled:opacity-60">
              {sending || scheduling ? <Loader2 className="animate-spin" size={18} /> : sendMode === "now" ? <Send size={18} /> : <CalendarClock size={18} />}
              {sendMode === "now" ? "Send email" : "Schedule email"}
            </button>
          </div>
        </div>
      </section>

      {message && <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 font-bold text-blue-700">{message}</div>}
      {!smtpEnabled && <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 font-bold text-amber-700">SMTP is not configured. Please check backend .env before sending email.</div>}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-xl font-black text-slate-950">Template setup</h2>
          <div className="space-y-4">
            <label>
              <span className="mb-2 block text-sm font-black text-slate-600">Email subject</span>
              <input
                value={settings.email_notification_subject}
                onChange={(event) => setSettings({ ...settings, email_notification_subject: event.target.value })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black text-slate-600">Email content</span>
              <textarea
                value={settings.email_notification_body}
                onChange={(event) => setSettings({ ...settings, email_notification_body: event.target.value })}
                className="min-h-44 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black text-slate-600">Signature</span>
              <input
                value={settings.email_notification_signature}
                onChange={(event) => setSettings({ ...settings, email_notification_signature: event.target.value })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </label>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Recipients</h2>
              <p className="text-sm text-slate-500">{selectedIds.length} partners selected</p>
            </div>
            <label className="min-w-44">
              <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Month</span>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-emerald-500" />
            </label>
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button type="button" onClick={() => setSendMode("now")} className={`rounded-xl px-4 py-2 text-sm font-black ${sendMode === "now" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Send now</button>
            <button type="button" onClick={() => setSendMode("schedule")} className={`rounded-xl px-4 py-2 text-sm font-black ${sendMode === "schedule" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Schedule</button>
          </div>

          {sendMode === "schedule" && (
            <div className="mb-4 grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 md:grid-cols-[1fr_160px]">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-wider text-emerald-700">Send at</span>
                <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 font-bold outline-none" />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-wider text-emerald-700">Resend after days</span>
                <input type="number" min="0" value={followUpDays} onChange={(event) => setFollowUpDays(event.target.value)} className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 font-bold outline-none" />
              </label>
            </div>
          )}

          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3">
            <Search size={18} className="text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search partner name or email..." className="min-w-0 flex-1 bg-transparent outline-none" />
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredPartners.map((partner) => {
              const checked = selectedIds.includes(partner.id);
              return (
                <button
                  type="button"
                  key={partner.id}
                  onClick={() => togglePartner(partner.id)}
                  className={[
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                    checked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  ].join(" ")}
                >
                  <span className={["flex h-10 w-10 items-center justify-center rounded-xl font-black", checked ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"].join(" ")}>
                    {checked ? <CheckCircle2 size={18} /> : <UserPlus size={18} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black text-slate-950">{partner.display_name || partner.partner_name}</span>
                    <span className="block truncate text-sm text-slate-500">{partner.email}</span>
                  </span>
                </button>
              );
            })}
            {!filteredPartners.length && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">No active partner email found.</div>}
          </div>

          {!!selectedPartners.length && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedPartners.map((partner) => (
                <span key={partner.id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                  {partner.display_name || partner.partner_name}
                  <button type="button" onClick={() => togglePartner(partner.id)} className="text-slate-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-300 px-6 py-6 text-white">
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-50">Email preview</p>
            <h2 className="mt-2 text-2xl font-black">{previewSubject}</h2>
          </div>
          <div className="p-6">
            <p className="mb-4 text-slate-800">Hello <b>{previewName}</b>,</p>
            {previewBody.split(/\r?\n/).filter(Boolean).map((line, index) => (
              <p key={index} className="mb-3 leading-7 text-slate-600">{line}</p>
            ))}
            <div className="my-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Report month</p>
              <p className="mt-1 text-2xl font-black text-emerald-950">{monthLabel(month)}</p>
            </div>
            <p className="text-slate-600">Best regards,</p>
            <p className="font-black text-emerald-700">{previewSignature}</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-black text-slate-950">Scheduled sends</h2>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-900">{schedule.subject}</p>
                    <p className="text-sm text-slate-500">{schedule.report_month} · {schedule.partner_ids?.length || 0} recipients</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{schedule.status}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                  <p><b>Next:</b> {dateTimeText(schedule.next_run_at)}</p>
                  <p><b>Follow-up:</b> {schedule.follow_up_days ? `${schedule.follow_up_days} day(s)` : "No"}</p>
                </div>
                {schedule.last_error && <p className="mt-2 text-sm font-bold text-red-600">{schedule.last_error}</p>}
                {["scheduled", "sent", "failed"].includes(schedule.status) && (
                  <button type="button" onClick={() => deleteSchedule(schedule.id)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-600 hover:bg-red-100">
                    <Trash2 size={15} />
                    Delete
                  </button>
                )}
              </div>
            ))}
            {!schedules.length && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">No scheduled email yet.</div>}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-black text-slate-950">Recent sends</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-900">{log.partner_name || log.recipient_email}</p>
                  <p className="truncate text-sm text-slate-500">{log.recipient_email}</p>
                </div>
                <span className={["rounded-full px-3 py-1 text-xs font-black", log.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"].join(" ")}>
                  {log.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{log.report_month} · {log.sent_at}</p>
              {log.error_message && <p className="mt-2 text-sm font-bold text-red-600">{log.error_message}</p>}
            </div>
          ))}
          {!logs.length && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">No email history yet.</div>}
        </div>
      </section>
    </div>
  );
}
