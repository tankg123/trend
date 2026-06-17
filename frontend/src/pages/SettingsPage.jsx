import { useEffect, useState } from "react";
import { ImageUp, Loader2, MonitorCog, Save, Upload } from "lucide-react";
import api from "../api/api";
import { useSystemSettings } from "../context/SystemSettingsContext";
import { useI18n } from "../context/I18nContext";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const { settings, setSettings } = useSystemSettings();
  const { t } = useI18n();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const useUploadedLogo = form.logo_mode === "upload" && form.logo_data_url;

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  async function handleFile(field, file) {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setForm((current) => ({ ...current, [field]: dataUrl }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage("");
      const res = await api.put("/settings/system", form);
      const nextSettings = res.data.settings || form;
      setSettings(nextSettings);
      setMessage("Settings saved");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
            <MonitorCog size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-950">{t("settings")}</h1>
            <p className="text-sm text-slate-500">{t("systemSettings")}</p>
          </div>
        </div>

        <form onSubmit={saveSettings} className="p-6 space-y-6">
          {message && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 font-bold text-blue-700">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
              <div
                className="mx-auto w-32 h-32 rounded-full flex items-center justify-center overflow-hidden shadow-lg"
                style={{ backgroundColor: useUploadedLogo ? "transparent" : "#2f8ccf" }}
              >
                {useUploadedLogo ? (
                  <img src={form.logo_data_url} alt="Brand logo" className="w-full h-full object-cover" />
                ) : (
                  <img src="https://revenue.ansnetwork.vn/images/logo-slideBar.png" alt="ANS" className="w-20 h-20 object-contain" />
                )}
              </div>
              <p className="mt-4 font-black text-slate-950">{form.brand_name || "ANS Network"}</p>
              <p className="text-sm font-bold text-slate-500">MCN Manager System</p>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="text-sm font-black text-slate-700">Brand name</span>
                <input
                  value={form.brand_name || ""}
                  onChange={(event) => setForm({ ...form, brand_name: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 bg-white"
                  placeholder="ANS Network"
                  required
                />
              </label>

              <div>
                <p className="text-sm font-black text-slate-700 mb-2">Sidebar logo</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, logo_mode: "random" })}
                    className={`rounded-2xl border px-4 py-4 text-left font-black ${form.logo_mode === "random" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}
                  >
                    Random color logo
                    <span className="block mt-1 text-xs font-bold text-slate-500">Use the current random round color.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, logo_mode: "upload" })}
                    className={`rounded-2xl border px-4 py-4 text-left font-black ${form.logo_mode === "upload" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}
                  >
                    Uploaded logo
                    <span className="block mt-1 text-xs font-bold text-slate-500">Use your uploaded logo image.</span>
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-black text-slate-700">Upload sidebar logo</span>
                <div className="mt-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 flex items-center gap-3">
                  <ImageUp size={18} className="text-slate-400" />
                  <input type="file" accept="image/*" onChange={(event) => handleFile("logo_data_url", event.target.files?.[0])} />
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 border-t border-slate-200 pt-6">
            <label className="block">
              <span className="text-sm font-black text-slate-700">Website title</span>
              <input
                value={form.web_title || ""}
                onChange={(event) => setForm({ ...form, web_title: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 bg-white"
                placeholder="ANS Network"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-700">Website icon</span>
              <div className="mt-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 flex items-center gap-3">
                {form.favicon_data_url ? (
                  <img src={form.favicon_data_url} alt="Website icon" className="w-7 h-7 rounded-lg object-contain" />
                ) : (
                  <Upload size={18} className="text-slate-400" />
                )}
                <input type="file" accept="image/*" onChange={(event) => handleFile("favicon_data_url", event.target.files?.[0])} />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-700">Default export template</span>
              <select
                value={form.export_template_language || "vi"}
                onChange={(event) => setForm({ ...form, export_template_language: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 bg-white font-bold text-slate-800"
              >
                <option value="vi">Vietnamese template (current)</option>
                <option value="en">English template</option>
              </select>
              <span className="mt-2 block text-xs font-bold text-slate-500">
                Used automatically for Excel and invoice PDF exports.
              </span>
            </label>
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-6">
            <button
              disabled={saving}
              className="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save settings
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
