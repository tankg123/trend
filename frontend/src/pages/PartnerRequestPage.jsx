import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import api from "../api/api";
import { useSystemSettings } from "../context/SystemSettingsContext";

const emptyForm = {
  partner_name: "",
  display_name: "",
  email: "",
  contact_name: "",
  phone: "",
  counter_email: "",
  address: "",
  payment_method: "pingpongx",
  pingpongx: "",
  bank_name: "",
  bank_holder: "",
  account_number: "",
  swift_code: "",
  bank_branch: "",
  internal_notes: ""
};

function Input({ label, className = "", ...props }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-bold text-slate-600">{label}</span>
      <input {...props} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500" />
    </label>
  );
}

function SelectInput({ label, className = "", children, ...props }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-bold text-slate-600">{label}</span>
      <select {...props} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500">
        {children}
      </select>
    </label>
  );
}

function normalizePaymentMethod(value) {
  return String(value || "pingpongx").toLowerCase() === "bank" ? "bank" : "pingpongx";
}

export default function PartnerRequestPage() {
  const { token } = useParams();
  const { settings } = useSystemSettings();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const res = await api.get(`/public/partner-requests/${token}`);
        if (!active) return;
        const data = res.data.data || {};
        setForm({ ...emptyForm, ...data, payment_method: normalizePaymentMethod(data.payment_method) });
      } catch (error) {
        setMessage(error.response?.data?.message || "This partner request link is invalid.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [token]);

  async function submitRequest(event) {
    event.preventDefault();
    try {
      setSaving(true);
      await api.post(`/public/partner-requests/${token}`, form);
      setDone(true);
      setMessage("Your partner information has been submitted. Our team will review and approve it soon.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not submit partner request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7,transparent_30%),radial-gradient(circle_at_bottom_right,#dbeafe,transparent_34%)] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-600 text-white shadow-xl">
            <ShieldCheck size={36} />
          </div>
          <h1 className="text-4xl font-black text-slate-950">{settings?.brand_name || "ANS Network"} Partner Request</h1>
          <p className="mt-2 text-slate-600">Please complete your partner profile and payment information.</p>
        </div>

        <section className="rounded-[32px] border border-white/80 bg-white/95 p-6 shadow-2xl shadow-slate-900/10">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
          ) : done ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="mx-auto text-emerald-600" size={64} />
              <h2 className="mt-5 text-3xl font-black text-slate-950">Request submitted</h2>
              <p className="mx-auto mt-3 max-w-xl text-slate-600">{message}</p>
            </div>
          ) : message && !form.partner_name ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center font-bold text-red-600">{message}</div>
          ) : (
            <form onSubmit={submitRequest} className="space-y-6">
              {message && <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 font-bold text-blue-700">{message}</div>}

              <div>
                <h2 className="mb-4 text-xl font-black text-slate-950">Basic information</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Partner Name *" value={form.partner_name} onChange={(e) => setForm({ ...form, partner_name: e.target.value })} required />
                  <Input label="Display Name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
                  <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  <Input label="Contact Person *" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} required />
                  <Input label="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                  <Input label="Counter Email" type="email" value={form.counter_email} onChange={(e) => setForm({ ...form, counter_email: e.target.value })} />
                  <Input className="md:col-span-2" label="Address *" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-xl font-black text-slate-950">Payment information</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <SelectInput label="Payment Method *" value={normalizePaymentMethod(form.payment_method)} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                    <option value="pingpongx">PingPongX</option>
                    <option value="bank">Bank Details</option>
                  </SelectInput>
                  {normalizePaymentMethod(form.payment_method) === "bank" ? (
                    <>
                      <Input label="Bank Name *" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} required />
                      <Input label="Bank Holder *" value={form.bank_holder} onChange={(e) => setForm({ ...form, bank_holder: e.target.value })} required />
                      <Input label="Account Number *" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} required />
                      <Input label="SWIFT Code *" value={form.swift_code} onChange={(e) => setForm({ ...form, swift_code: e.target.value })} required />
                      <Input label="Bank Branch *" value={form.bank_branch} onChange={(e) => setForm({ ...form, bank_branch: e.target.value })} required />
                    </>
                  ) : (
                    <Input className="md:col-span-2" label="PingPongX Email *" type="email" value={form.pingpongx} onChange={(e) => setForm({ ...form, pingpongx: e.target.value })} required />
                  )}
                </div>
              </div>

              <label>
                <span className="mb-2 block text-sm font-bold text-slate-600">Notes</span>
                <textarea value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
              </label>

              <div className="flex justify-end">
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg shadow-blue-900/20 disabled:opacity-60">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Submit request
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
