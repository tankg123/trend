import { useEffect, useState } from "react";
import { Edit3, Loader2, MoreHorizontal, Plus, RefreshCw, Search, Trash2, User, X } from "lucide-react";
import api from "../api/api";

const emptyForm = {
  name: "",
  display_name: "",
  theme_color: "#137fec",
  status: "active",
  dashboard_enabled: false,
  notes: ""
};

export default function CollaboratorsPage() {
  const [items, setItems] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchItems() {
    try {
      setLoading(true);
      const res = await api.get("/channels/collaborators", { params: { keyword } });
      setItems(res.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not load collaborators");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ ...emptyForm, ...item, dashboard_enabled: Boolean(item.dashboard_enabled) });
    setModalOpen(true);
  }

  async function saveItem(event) {
    event.preventDefault();
    try {
      setSaving(true);
      if (editing) await api.put(`/channels/collaborators/${editing.id}`, form);
      else await api.post("/channels/collaborators", form);
      setModalOpen(false);
      setMessage(editing ? "Collaborator updated" : "Collaborator created");
      await fetchItems();
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not save collaborator");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id) {
    if (!window.confirm("Delete this collaborator?")) return;
    await api.delete(`/channels/collaborators/${id}`);
    await fetchItems();
  }

  useEffect(() => {
    const timer = setTimeout(fetchItems, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  return (
    <CrudShell
      title="Collaborators"
      subtitle="Manage collaborator list"
      keyword={keyword}
      onKeyword={setKeyword}
      onCreate={openCreate}
      onRefresh={fetchItems}
      message={message}
      loading={loading}
    >
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
          <tr><th className="text-left px-5 py-3">ID</th><th className="text-left px-5 py-3">Collaborator</th><th className="text-left px-5 py-3">Note</th><th className="text-left px-5 py-3">Created / Updated</th><th className="text-right px-5 py-3">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-5 py-4 text-slate-500 font-mono">#{String(item.id).padStart(6, "0")}</td>
              <td className="px-5 py-4">
                <div className="rounded-2xl border border-slate-200 border-l-4 px-4 py-3 relative" style={{ borderLeftColor: item.theme_color || "#137fec" }}>
                  <p className="font-black text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.display_name || item.name}</p>
                  <span className="absolute right-4 top-4 w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </td>
              <td className="px-5 py-4 text-slate-500">{item.notes || "-"}</td>
              <td className="px-5 py-4 text-xs text-slate-600"><b>Created</b> {item.created_at}<br /><b>Updated</b> {item.updated_at}</td>
              <td className="px-5 py-4 text-right">
                <button onClick={() => openEdit(item)} className="w-9 h-9 rounded-xl border border-slate-200 inline-flex items-center justify-center mr-2"><Edit3 size={15} /></button>
                <button onClick={() => deleteItem(item.id)} className="w-9 h-9 rounded-xl border border-red-100 bg-red-50 text-red-600 inline-flex items-center justify-center"><Trash2 size={15} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalOpen && (
        <CollaboratorModal form={form} setForm={setForm} editing={editing} saving={saving} onClose={() => setModalOpen(false)} onSave={saveItem} />
      )}
    </CrudShell>
  );
}

function CollaboratorModal({ form, setForm, editing, saving, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={onSave} className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">{editing ? "Edit Collaborator" : "Create New Collaborator"}</h2>
          <button type="button" onClick={onClose} className="w-11 h-11 rounded-xl border border-slate-300 flex items-center justify-center"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          <h3 className="font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><User size={18} /> Basic</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Enter collaborator name" required />
            <Input label="Display Name" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} placeholder="Optional" />
            <label className="rounded-2xl border border-slate-300 p-4 min-h-28">
              <span className="text-sm font-bold text-slate-500 block mb-2">Theme Color</span>
              <div className="flex items-center justify-between">
                <b>{form.theme_color}</b>
                <input type="color" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} className="w-12 h-12 rounded-xl" />
              </div>
            </label>
            <div className="space-y-3">
              <Toggle label="Status" checked={form.status === "active"} onChange={(checked) => setForm({ ...form, status: checked ? "active" : "disabled" })} active="Active" inactive="Disabled" />
              <Toggle label="Dashboard" checked={form.dashboard_enabled} onChange={(checked) => setForm({ ...form, dashboard_enabled: checked })} active="Enabled" inactive="Disabled" />
            </div>
          </div>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add any internal notes..." className="w-full min-h-28 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" />
        </div>
        <div className="px-6 py-5 border-t border-slate-200 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-3 font-bold">Cancel</button>
          <button disabled={saving || !form.name} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black disabled:opacity-40">{editing ? "Save Collaborator" : "Create Collaborator"}</button>
        </div>
      </form>
    </div>
  );
}

export function CrudShell({ title, subtitle, keyword, onKeyword, onCreate, onRefresh, message, loading, children }) {
  return (
    <div className="p-4 lg:p-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><h1 className="text-2xl font-black text-slate-900">{title}</h1><p className="text-sm text-slate-500">{subtitle}</p></div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><Search size={15} className="text-slate-400" /><input value={keyword} onChange={(e) => onKeyword(e.target.value)} placeholder="Search..." className="outline-none text-sm" /></label>
            <button onClick={onRefresh} className="px-4 py-2 rounded-xl border border-slate-200 font-bold flex items-center gap-2"><RefreshCw size={15} /> Refresh</button>
            <button onClick={onCreate} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-2"><Plus size={15} /> Create new</button>
          </div>
        </div>
        {message && <div className="mx-5 mt-4 rounded-2xl bg-blue-50 text-blue-700 px-4 py-3 font-medium">{message}</div>}
        {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div> : <div className="overflow-x-auto">{children}</div>}
      </div>
    </div>
  );
}

export function Input({ label, value, onChange, ...props }) {
  return <label><span className="text-sm text-slate-700 mb-2 block">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" {...props} /></label>;
}

export function Toggle({ label, checked, onChange, active, inactive }) {
  return (
    <label>
      <span className="text-sm text-slate-700 mb-2 block">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 flex items-center justify-between">
        <span className={checked ? "text-emerald-700" : "text-slate-500"}>{checked ? active : inactive}</span>
        <span className={checked ? "w-11 h-6 rounded-full bg-emerald-500 relative" : "w-11 h-6 rounded-full bg-slate-200 relative"}>
          <span className={checked ? "absolute right-1 top-1 w-4 h-4 rounded-full bg-white" : "absolute left-1 top-1 w-4 h-4 rounded-full bg-white"} />
        </span>
      </button>
    </label>
  );
}
