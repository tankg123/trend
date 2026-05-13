import { useEffect, useState } from "react";
import { Edit3, Loader2, Network, Plus, Trash2, X } from "lucide-react";
import api from "../api/api";

const emptyNetwork = {
  name: "",
  description: ""
};

export default function NetworkPage() {
  const [networks, setNetworks] = useState([]);
  const [form, setForm] = useState(emptyNetwork);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchNetworks() {
    try {
      setLoading(true);
      const res = await api.get("/reports/networks");
      setNetworks(res.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Lỗi tải network");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyNetwork);
    setModalOpen(true);
  }

  function openEdit(network) {
    setEditing(network);
    setForm({
      name: network.name || "",
      description: network.description || ""
    });
    setModalOpen(true);
  }

  async function saveNetwork(e) {
    e.preventDefault();

    try {
      setSaving(true);
      if (editing) {
        await api.put(`/reports/networks/${editing.id}`, form);
        setMessage("Đã cập nhật network");
      } else {
        await api.post("/reports/networks", form);
        setMessage("Đã tạo network");
      }

      setModalOpen(false);
      await fetchNetworks();
    } catch (error) {
      setMessage(error.response?.data?.message || error.response?.data?.error || "Lỗi lưu network");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNetwork(id) {
    if (!window.confirm("Xóa network này? Report import của network này cũng sẽ bị xóa.")) return;

    try {
      await api.delete(`/reports/networks/${id}`);
      setMessage("Đã xóa network");
      await fetchNetworks();
    } catch (error) {
      setMessage(error.response?.data?.message || "Lỗi xóa network");
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNetworks();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-5 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <Network size={18} />
            Network
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900">Network</h1>
          <p className="text-slate-500 mt-2">Tạo network và mô tả network để gắn với từng lần import report.</p>
        </div>

        <button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-5 py-3 font-bold flex items-center justify-center gap-2">
          <Plus size={18} />
          Add network
        </button>
      </div>

      {message && <div className="mb-5 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl px-5 py-4 font-medium">{message}</div>}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-cyan-600" size={36} />
        </div>
      ) : networks.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-500">Chưa có network nào.</div>
      ) : (
        <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-5">
          {networks.map((network) => (
            <div key={network.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-slate-900 truncate">{network.name}</h2>
                  <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{network.description || "Không có mô tả"}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(network)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center" title="Edit">
                    <Edit3 size={17} />
                  </button>
                  <button onClick={() => deleteNetwork(network.id)} className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center" title="Delete">
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-400">
                Created: {network.created_at || "-"}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={saveNetwork} className="w-full max-w-xl bg-white rounded-3xl shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">{editing ? "Edit Network" : "Create Network"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="w-10 h-10 rounded-xl border border-slate-300 flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label>
                <span className="text-sm text-slate-700 mb-2 block">Network Name *</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500"
                  placeholder="Ví dụ: Ohenemedia - Music"
                  required
                />
              </label>

              <label>
                <span className="text-sm text-slate-700 mb-2 block">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full min-h-32 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500"
                  placeholder="Mô tả network..."
                />
              </label>
            </div>

            <div className="px-6 py-5 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-3 rounded-2xl border border-slate-300 font-bold">Hủy</button>
              <button type="submit" disabled={saving} className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold flex items-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="animate-spin" size={18} /> : null}
                Lưu network
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
