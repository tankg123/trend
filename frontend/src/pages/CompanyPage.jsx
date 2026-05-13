import { useEffect, useState } from "react";
import { Building2, BriefcaseBusiness, CreditCard, Edit3, Loader2, Mail, MapPin, Phone, Plus, Trash2, User, X } from "lucide-react";
import api from "../api/api";

const emptyCompany = {
  company_name: "",
  email: "",
  phone: "",
  address: "",
  representative_name: "",
  representative_position: "",
  hr_name: "",
  bank_name: "",
  account_number: "",
  tax_code: "",
  notes: ""
};

function Field({ label, icon: Icon, className = "", ...props }) {
  return (
    <label className={className}>
      <span className="text-sm text-slate-700 mb-2 flex items-center gap-2">
        {Icon ? <Icon size={16} /> : null}
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
      />
    </label>
  );
}

export default function CompanyPage() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(emptyCompany);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchCompanies() {
    try {
      setLoading(true);
      const res = await api.get("/reports/companies");
      setCompanies(res.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not load companies");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyCompany);
    setModalOpen(true);
  }

  function openEdit(company) {
    setEditing(company);
    setForm({ ...emptyCompany, ...company });
    setModalOpen(true);
  }

  async function saveCompany(event) {
    event.preventDefault();

    try {
      setSaving(true);
      if (editing) {
        await api.put(`/reports/companies/${editing.id}`, form);
        setMessage("Company updated");
      } else {
        await api.post("/reports/companies", form);
        setMessage("Company created");
      }
      setModalOpen(false);
      await fetchCompanies();
    } catch (error) {
      setMessage(error.response?.data?.message || error.response?.data?.error || "Could not save company");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCompany(id) {
    if (!window.confirm("Delete this company?")) return;

    try {
      await api.delete(`/reports/companies/${id}`);
      setMessage("Company deleted");
      await fetchCompanies();
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not delete company");
    }
  }

  useEffect(() => {
    fetchCompanies();
  }, []);

  return (
    <div className="p-5 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <BriefcaseBusiness size={18} />
            Company
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900">Company</h1>
          <p className="text-slate-500 mt-2">Manage company profiles used as the sender on Excel and PDF invoices.</p>
        </div>

        <button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-5 py-3 font-bold flex items-center justify-center gap-2">
          <Plus size={18} />
          Add company
        </button>
      </div>

      {message && <div className="mb-5 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl px-5 py-4 font-medium">{message}</div>}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-500">No companies yet.</div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-5">
          {companies.map((company) => (
            <div key={company.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{company.company_name}</h2>
                  <p className="text-slate-500">{company.representative_name || "No representative"}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(company)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center" title="Edit">
                    <Edit3 size={17} />
                  </button>
                  <button onClick={() => deleteCompany(company.id)} className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center" title="Delete">
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <p className="text-slate-500"><b className="text-slate-800">Email:</b> {company.email || "-"}</p>
                <p className="text-slate-500"><b className="text-slate-800">Phone:</b> {company.phone || "-"}</p>
                <p className="text-slate-500 sm:col-span-2"><b className="text-slate-800">Address:</b> {company.address || "-"}</p>
                <p className="text-slate-500"><b className="text-slate-800">Representative:</b> {company.representative_name || "-"}</p>
                <p className="text-slate-500"><b className="text-slate-800">Position:</b> {company.representative_position || "-"}</p>
                <p className="text-slate-500"><b className="text-slate-800">Bank:</b> {company.bank_name || "-"}</p>
                <p className="text-slate-500"><b className="text-slate-800">Account:</b> {company.account_number || "-"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={saveCompany} className="w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">{editing ? "Edit Company" : "Create New Company"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="w-11 h-11 rounded-xl border border-slate-300 flex items-center justify-center">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-7">
              <section className="border border-slate-200 rounded-3xl p-5">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-5">
                  <Building2 size={18} />
                  Company Information
                </h3>
                <div className="grid lg:grid-cols-2 gap-4">
                  <Field className="lg:col-span-2" icon={Building2} label="Company Name *" value={form.company_name} placeholder="Enter company name" onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
                  <Field icon={Mail} label="Email" value={form.email} placeholder="example@company.com" onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <Field icon={Phone} label="Phone" value={form.phone} placeholder="0900 000 000" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <Field className="lg:col-span-2" icon={MapPin} label="Address" value={form.address} placeholder="Street, district, city, country" onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </section>

              <section className="border border-slate-200 rounded-3xl p-5">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-5">
                  <User size={18} />
                  Representative
                </h3>
                <div className="grid lg:grid-cols-3 gap-4">
                  <Field icon={User} label="Full Name" value={form.representative_name} placeholder="Nguyen Van A" onChange={(e) => setForm({ ...form, representative_name: e.target.value })} />
                  <Field icon={BriefcaseBusiness} label="Position" value={form.representative_position} placeholder="Director" onChange={(e) => setForm({ ...form, representative_position: e.target.value })} />
                  <Field icon={User} label="HR Responsible" value={form.hr_name} placeholder="HR name" onChange={(e) => setForm({ ...form, hr_name: e.target.value })} />
                </div>
              </section>

              <section className="border border-slate-200 rounded-3xl p-5">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-5">
                  <CreditCard size={18} />
                  Billing Details
                </h3>
                <div className="grid lg:grid-cols-3 gap-4">
                  <Field label="Bank Name" value={form.bank_name} placeholder="Bank name" onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                  <Field label="Account Number" value={form.account_number} placeholder="Account number" onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
                  <Field label="Tax Code" value={form.tax_code} placeholder="Tax/VAT code" onChange={(e) => setForm({ ...form, tax_code: e.target.value })} />
                  <label className="lg:col-span-3">
                    <span className="text-sm text-slate-700 mb-2 block">Notes</span>
                    <textarea
                      value={form.notes}
                      placeholder="Internal notes or invoice notes..."
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full min-h-28 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:border-blue-500 outline-none"
                    />
                  </label>
                </div>
              </section>
            </div>

            <div className="px-6 py-5 border-t border-slate-200 flex justify-end gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-3 rounded-2xl border border-slate-300 font-bold">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold flex items-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="animate-spin" size={18} /> : null}
                {editing ? "Save company" : "Create company"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
