import { useEffect, useMemo, useState } from "react";
import { Check, Download, FileSpreadsheet, Loader2, Search } from "lucide-react";
import api from "../api/api";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(month) {
  if (!month) return "Select month";
  const [year, value] = month.split("-");
  return new Date(Number(year), Number(value) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function money(value, currency = "USD") {
  const normalized = ["VND", "GBP", "USD"].includes(String(currency).toUpperCase()) ? String(currency).toUpperCase() : "USD";
  const locale = normalized === "VND" ? "vi-VN" : normalized === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalized,
    maximumFractionDigits: normalized === "VND" ? 0 : 2
  }).format(Number(value || 0));
}

function safeName(value) {
  return String(value || "group").replace(/[\\/:*?"<>|]+/g, "-").trim();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function ExportMultiPage() {
  const [month, setMonth] = useState(currentMonth());
  const [groups, setGroups] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [format, setFormat] = useState("excel");
  const [includeSignatures, setIncludeSignatures] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchData() {
    try {
      setLoading(true);
      const [groupsRes, companiesRes] = await Promise.all([
        api.get("/reports/groups", { params: { month } }),
        api.get("/reports/companies")
      ]);
      const nextGroups = groupsRes.data.data || [];
      const nextCompanies = companiesRes.data.data || [];
      setGroups(nextGroups);
      setCompanies(nextCompanies);
      setSelectedIds((current) => current.filter((id) => nextGroups.some((group) => Number(group.id) === Number(id))));
      if (!companyId && nextCompanies[0]) setCompanyId(String(nextCompanies[0].id));
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not load export data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const filteredGroups = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return [...groups]
      .sort((left, right) => String(left.group_name || "").localeCompare(String(right.group_name || ""), "vi", { sensitivity: "base" }))
      .filter((group) => {
        if (!q) return true;
        return [group.group_name, group.partner_name, group.currency].some((value) => String(value || "").toLowerCase().includes(q));
      });
  }, [groups, keyword]);

  const allFilteredSelected = filteredGroups.length > 0 && filteredGroups.every((group) => selectedIds.includes(group.id));

  function toggleGroup(id) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllFiltered() {
    const filteredIds = filteredGroups.map((group) => group.id);
    setSelectedIds((current) => {
      if (filteredIds.length && filteredIds.every((id) => current.includes(id))) {
        return current.filter((id) => !filteredIds.includes(id));
      }
      return Array.from(new Set([...current, ...filteredIds]));
    });
  }

  function downloadBlob(data, fileName, type) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function exportSelected() {
    if (!selectedIds.length) {
      setMessage("Please choose at least one group to export.");
      return;
    }

    try {
      setExporting(true);
      setMessage(`Exporting ${selectedIds.length} group${selectedIds.length > 1 ? "s" : ""}...`);
      const selectedGroups = groups.filter((group) => selectedIds.includes(group.id));

      for (const group of selectedGroups) {
        if (format === "pdf") {
          const res = await api.post(`/reports/groups/${group.id}/export/pdf`, {
            month,
            company_id: companyId,
            return_base64: true,
            include_signatures: includeSignatures
          }, { timeout: 60000 });
          const binary = atob(res.data.data || "");
          const bytes = new Uint8Array(binary.length);
          for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
          downloadBlob(bytes, res.data.fileName || `${safeName(group.group_name)}-${month}.pdf`, res.data.mimeType || "application/pdf");
        } else {
          const res = await api.post(`/reports/groups/${group.id}/export/excel`, {
            month,
            company_id: companyId
          }, {
            responseType: "blob",
            timeout: 60000
          });
          downloadBlob(
            res.data,
            `${safeName(group.group_name)}-${month}.xlsx`,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
        }
        await sleep(250);
      }

      setMessage(`Exported ${selectedGroups.length} group${selectedGroups.length > 1 ? "s" : ""}.`);
    } catch (error) {
      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          const parsed = JSON.parse(text);
          setMessage(parsed.message || parsed.error || "Could not export selected groups");
        } catch {
          setMessage(text || "Could not export selected groups");
        }
      } else {
        setMessage(error.response?.data?.message || error.message || "Could not export selected groups");
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-5 lg:p-8">
      <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">
              <FileSpreadsheet size={15} />
              Report export
            </p>
            <h1 className="text-2xl font-black text-slate-900">Export Multi</h1>
            <p className="mt-1 text-sm text-slate-500">Choose multiple groups and export invoices for the selected month.</p>
          </div>
          <button
            type="button"
            onClick={exportSelected}
            disabled={exporting || !selectedIds.length}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white shadow-sm disabled:opacity-50"
          >
            {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
            Export selected ({selectedIds.length})
          </button>
        </div>
      </section>

      {message && <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 font-bold text-blue-700">{message}</div>}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label>
              <span className="mb-2 block text-xs font-black uppercase text-slate-400">Month</span>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value || currentMonth())}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs font-black uppercase text-slate-400">Company</span>
              <select
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
              >
                {companies.length === 0 ? <option value="">Default company</option> : companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.company_name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-black uppercase text-slate-400">Format</span>
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
              >
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </label>
            <label className={format === "pdf" ? "block" : "hidden"}>
              <span className="mb-2 block text-xs font-black uppercase text-slate-400">PDF signature</span>
              <button
                type="button"
                onClick={() => setIncludeSignatures((value) => !value)}
                className={`flex w-full items-center gap-2 rounded-2xl border px-4 py-3 font-bold ${includeSignatures ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600"}`}
              >
                <Check size={17} />
                {includeSignatures ? "Include sign boxes" : "No sign boxes"}
              </button>
            </label>
            <label>
              <span className="mb-2 block text-xs font-black uppercase text-slate-400">Search</span>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3">
                <Search size={17} className="text-slate-400" />
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Group or partner..." />
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-black text-slate-900">{monthLabel(month)}</h2>
            <p className="text-sm text-slate-500">{filteredGroups.length} groups available</p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleAllFiltered}
              className="h-4 w-4"
            />
            <span>Select all groups</span>
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-600" size={34} /></div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No groups found for this month.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredGroups.map((group) => {
              const checked = selectedIds.includes(group.id);
              return (
                <label key={group.id} className={`flex cursor-pointer flex-col gap-3 p-5 hover:bg-slate-50 md:flex-row md:items-center md:justify-between ${checked ? "bg-blue-50/60" : ""}`}>
                  <div className="flex items-start gap-4">
                    <input type="checkbox" checked={checked} onChange={() => toggleGroup(group.id)} className="mt-1 h-4 w-4" />
                    <div>
                      <p className="font-black text-slate-900">{group.group_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{group.partner_name || "-"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-right text-sm md:min-w-[420px]">
                    <p><span className="block text-xs font-black uppercase text-slate-400">Channels</span><b>{group.channel_count || 0}</b></p>
                    <p><span className="block text-xs font-black uppercase text-slate-400">Currency</span><b>{group.currency || "USD"}</b></p>
                    <p><span className="block text-xs font-black uppercase text-slate-400">Paid</span><b className="text-emerald-700">{money(group.summary?.paid_converted ?? group.summary?.paid ?? 0, group.currency)}</b></p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
