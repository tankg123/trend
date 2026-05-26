import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileVideo, FolderOpen, RefreshCw, Trash2 } from "lucide-react";
import api from "../api/api";

const MATCH_POLICIES = [
  "Monetize in all countries",
  "Track in all countries",
  "Block in all countries",
  "Manual Review"
];

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi"];

function removeVietnameseTones(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function randomToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function makeCustomId(label) {
  const cleaned = removeVietnameseTones(label || "Label").replace(/[^a-zA-Z0-9]/g, "") || "Label";
  return `${cleaned}_${randomToken()}`;
}

function makeRow(filename = "") {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    reference_filename: filename,
    custom_id: makeCustomId("Label"),
    add_asset_labels: "",
    title: filename.replace(/\.[^/.]+$/, ""),
    ownership: ""
  };
}

function quoteCsvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCSV(data, filename) {
  const csv = data.map((row) => row.map(quoteCsvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ContentIdWebAssetPage() {
  const folderRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [matchPolicy, setMatchPolicy] = useState(MATCH_POLICIES[0]);
  const [filename, setFilename] = useState("");
  const [multiTitles, setMultiTitles] = useState("");
  const [labels, setLabels] = useState([]);
  const [toast, setToast] = useState("");
  const [errors, setErrors] = useState({});

  const stats = useMemo(() => {
    const filledLabels = rows.filter((row) => row.add_asset_labels.trim()).length;
    const filledOwnership = rows.filter((row) => row.ownership.trim()).length;
    return { filledLabels, filledOwnership };
  }, [rows]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  const loadLabels = () => {
    api.get("/content-id/labels")
      .then((res) => setLabels(res.data.labels || []))
      .catch(() => {
        setLabels([]);
        showToast("Could not load labels.");
      });
  };

  useEffect(() => {
    loadLabels();
  }, []);

  const regenerateCustomIds = (nextRows) => nextRows.map((row) => ({
    ...row,
    custom_id: makeCustomId(row.add_asset_labels)
  }));

  const addFiles = (files) => {
    const nextRows = Array.from(files || [])
      .filter((file) => VIDEO_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)))
      .map((file) => makeRow(file.name));

    if (!nextRows.length) {
      showToast("No supported video files found.");
      return;
    }

    setRows((current) => regenerateCustomIds([...current, ...nextRows]));
    setErrors({});
    showToast(`Added ${nextRows.length} video files.`);
  };

  const updateRow = (rowId, field, value) => {
    setRows((current) => {
      const changedIndex = current.findIndex((row) => row.id === rowId);
      const next = current.map((row, index) => {
        if (row.id === rowId) return { ...row, [field]: value };
        if ((field === "add_asset_labels" || field === "ownership") && index !== 0) {
          return { ...row, [field]: value };
        }
        return row;
      });
      if (changedIndex === 0 || field === "add_asset_labels" || field === "ownership") {
        return field === "add_asset_labels" ? regenerateCustomIds(next) : next;
      }
      return next;
    });
    setErrors((current) => {
      const next = { ...current };
      delete next[`${rowId}:${field}`];
      return next;
    });
  };

  const removeRow = (rowId) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
    setErrors((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${rowId}:`)) delete next[key];
      });
      return next;
    });
  };

  const clearTable = () => {
    setRows([]);
    setMatchPolicy(MATCH_POLICIES[0]);
    setMultiTitles("");
    setFilename("");
    setErrors({});
    if (folderRef.current) folderRef.current.value = "";
    showToast("Table and data reset.");
  };

  const replaceTitles = () => {
    const titles = multiTitles.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    setRows((current) => current.map((row, index) => ({
      ...row,
      title: titles[index] || row.title
    })));
    showToast("Titles updated.");
  };

  const exportCSV = () => {
    if (!filename.trim()) {
      showToast("Please enter a CSV file name.");
      setErrors((current) => ({ ...current, filename: true }));
      return;
    }
    if (!rows.length) {
      showToast("No data to export.");
      return;
    }
    if (!matchPolicy) {
      showToast("Please select a match policy.");
      setErrors((current) => ({ ...current, matchPolicy: true }));
      return;
    }

    const requiredFields = ["reference_filename", "add_asset_labels", "title", "ownership"];
    const nextErrors = {};
    rows.forEach((row) => {
      requiredFields.forEach((field) => {
        if (!String(row[field] || "").trim()) nextErrors[`${row.id}:${field}`] = true;
      });
    });

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      showToast("Please fill in all required fields.");
      return;
    }

    const headers = ["reference_filename", "custom_id", "add_asset_labels", "title", "ownership", "match_policy"];
    const data = [
      headers,
      ...rows.map((row) => [
        row.reference_filename,
        row.custom_id,
        row.add_asset_labels,
        row.title,
        row.ownership,
        matchPolicy
      ])
    ];
    const outputName = filename.trim().endsWith(".csv") ? filename.trim() : `${filename.trim()}.csv`;
    downloadCSV(data, outputName);
    showToast(`Downloaded ${outputName}.`);
  };

  const inputClass = (key) => [
    "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
    errors[key] ? "border-red-400" : "border-slate-200"
  ].join(" ");

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              <FileVideo size={14} />
              Content ID
            </span>
            <h1 className="mt-3 text-3xl font-black text-slate-950">Web Asset Reference Only CID</h1>
            <p className="mt-1 text-sm text-slate-500">Create reference-only CSV files from video folders.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={folderRef}
              type="file"
              webkitdirectory=""
              multiple
              className="hidden"
              onChange={(event) => addFiles(event.target.files)}
            />
            <button
              type="button"
              onClick={() => folderRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
            >
              <FolderOpen size={17} />
              Select video folder
            </button>
            <button
              type="button"
              onClick={clearTable}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Clear table
            </button>
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
            >
              <Download size={17} />
              Download CSV
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Match policy</span>
            <select
              value={matchPolicy}
              onChange={(event) => {
                setMatchPolicy(event.target.value);
                setErrors((current) => ({ ...current, matchPolicy: false }));
              }}
              className={inputClass("matchPolicy")}
            >
              {MATCH_POLICIES.map((policy) => (
                <option key={policy} value={policy}>{policy}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">CSV file name</span>
            <input
              value={filename}
              onChange={(event) => {
                setFilename(event.target.value);
                setErrors((current) => ({ ...current, filename: false }));
              }}
              placeholder="File name"
              className={inputClass("filename")}
            />
          </label>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">Rows</p>
              <p className="text-2xl font-black text-slate-950">{rows.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">Labels</p>
              <p className="text-2xl font-black text-slate-950">{stats.filledLabels}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">Ownership</p>
              <p className="text-2xl font-black text-slate-950">{stats.filledOwnership}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-black text-slate-900">Asset Label source</p>
            <p className="text-xs text-slate-500">Choose from labels created in Content ID &gt; Label.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">{labels.length} labels</span>
            <button
              type="button"
              onClick={loadLabels}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
            >
              <RefreshCw size={14} />
              Refresh labels
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Bulk title replacement</span>
            <textarea
              value={multiTitles}
              onChange={(event) => setMultiTitles(event.target.value)}
              rows={4}
              placeholder="Paste one title per line"
              className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            onClick={replaceTitles}
            className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100"
          >
            Update titles
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Reference rows</h2>
            <p className="text-sm text-slate-500">Custom ID is generated automatically and exported as a hidden CSV field.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{rows.length} rows</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-16 px-4 py-3 text-center">X</th>
                <th className="px-4 py-3">Reference filename</th>
                <th className="px-4 py-3">Asset Label</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Ownership</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Select a folder with .mp4, .mov, or .avi files to start.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                      title="Remove row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row.reference_filename}
                      readOnly
                      className={inputClass(`${row.id}:reference_filename`)}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">custom_id: {row.custom_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.add_asset_labels}
                      onChange={(event) => updateRow(row.id, "add_asset_labels", event.target.value)}
                      className={inputClass(`${row.id}:add_asset_labels`)}
                    >
                      <option value="">{labels.length ? "Select label" : "No labels available"}</option>
                      {labels.map((label) => (
                        <option key={label.id} value={label.name}>{label.display_name || label.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row.title}
                      onChange={(event) => updateRow(row.id, "title", event.target.value)}
                      placeholder="Title"
                      className={inputClass(`${row.id}:title`)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row.ownership}
                      onChange={(event) => updateRow(row.id, "ownership", event.target.value)}
                      placeholder="Ownership"
                      className={inputClass(`${row.id}:ownership`)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
