import { useEffect, useState } from "react";
import { Edit3, Trash2, X } from "lucide-react";
import api from "../api/api";
import { CrudShell, Input, Toggle } from "./CollaboratorsPage";

const emptyForm = {
  name: "",
  share_rate: 0,
  theme_color: "#137fec",
  status: "active",
  notes: ""
};

export default function RevenueSharingPage() {
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
      const res = await api.get("/channels/revenue-sharings", { params: { keyword } });
      setItems(res.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not load revenue sharings");
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
    setForm({ ...emptyForm, ...item });
    setModalOpen(true);
  }

  async function saveItem(event) {
    event.preventDefault();
    try {
      setSaving(true);
      if (editing) await api.put(`/channels/revenue-sharings/${editing.id}`, form);
      else await api.post("/channels/revenue-sharings", form);
      setModalOpen(false);
      setMessage(editing ? "Revenue sharing updated" : "Revenue sharing created");
      await fetchItems();
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not save revenue sharing");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id) {
    if (!window.confirm("Delete this revenue sharing?")) return;
    await api.delete(`/channels/revenue-sharings/${id}`);
    await fetchItems();
  }

  useEffect(() => {
    const timer = setTimeout(fetchItems, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  return (
    <CrudShell title="Revenue Sharings" subtitle="Manage revenue sharing list" keyword={keyword} onKeyword={setKeyword} onCreate={openCreate} onRefresh={fetchItems} message={message} loading={loading}>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
          <tr><th className="text-left px-5 py-3">ID</th><th className="text-left px-5 py-3">Revenue Sharing</th><th className="text-left px-5 py-3">Note</th><th className="text-left px-5 py-3">Created / Updated</th><th className="text-right px-5 py-3">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-5 py-4 text-slate-500 font-mono">#{String(item.id).padStart(6, "0")}</td>
              <td className="px-5 py-4">
                <div className="rounded-2xl border border-slate-200 border-l-4 px-4 py-3 relative" style={{ borderLeftColor: item.theme_color || "#137fec" }}>
                  <p className="font-black text-slate-900">{item.name}</p>
                  <span className="inline-flex mt-2 rounded-full border border-slate-200 px-2 py-1 text-xs font-bold" style={{ color: item.theme_color || "#137fec" }}>{item.theme_color || "#137fec"}</span>
                  <span className="absolute right-4 top-4 w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </td>
              <td className="px-5 py-4 text-slate-500 italic">{item.notes || "No note"}</td>
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={saveItem} className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">{editing ? "Edit Revenue Sharing" : "Create New Revenue Sharing"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="w-11 h-11 rounded-xl border border-slate-300 flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-4">
              <Input label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="80% Không Thuế" required />
              <Input label="Share Rate (%)" type="number" value={form.share_rate} onChange={(v) => setForm({ ...form, share_rate: v })} placeholder="80" />
              <label className="rounded-2xl border border-slate-300 p-4">
                <span className="text-sm font-bold text-slate-500 block mb-2">Theme Color</span>
                <div className="flex items-center justify-between"><b>{form.theme_color}</b><input type="color" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} className="w-12 h-12" /></div>
              </label>
              <Toggle label="Status" checked={form.status === "active"} onChange={(checked) => setForm({ ...form, status: checked ? "active" : "disabled" })} active="Active" inactive="Disabled" />
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="No note" className="md:col-span-2 min-h-28 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" />
            </div>
            <div className="px-6 py-5 border-t border-slate-200 flex justify-end gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-3 font-bold">Cancel</button>
              <button disabled={saving || !form.name} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black disabled:opacity-40">{editing ? "Save Revenue Sharing" : "Create Revenue Sharing"}</button>
            </div>
          </form>
        </div>
      )}
    </CrudShell>
  );
}
