import { useEffect, useMemo, useState } from "react";
import { Camera, Edit3, Landmark, Plus, ReceiptText, RefreshCw, Trash2, WalletCards, X } from "lucide-react";
import api from "../api/api";
import { useI18n } from "../context/I18nContext";

const currencies = ["VND", "USD", "GBP"];
const accountTypes = ["bank", "cash", "wallet", "card", "other"];
const ownerTypes = [
  { value: "company", labelKey: "companyOwner" },
  { value: "personal", labelKey: "personal" },
  { value: "external", labelKey: "external" }
];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function money(value, currency = "VND") {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: currency === "VND" ? 0 : 2,
    minimumFractionDigits: 0
  }).format(amount) + ` ${currency}`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function PageShell({ badge, title, description, actions, children }) {
  return (
    <div className="min-w-0 space-y-5 p-4 sm:p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {badge ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                {badge}
              </span>
            ) : null}
            <h1 className="mt-3 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">{title}</h1>
            {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    green: "bg-emerald-600 text-white hover:bg-emerald-700",
    ghost: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300"
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function inputClass() {
  return "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
}

function Modal({ title, children, onClose, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-xl font-black text-slate-950 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-2xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">{footer}</div> : null}
      </div>
    </div>
  );
}

function EmptyState({ children = "No data yet." }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400">
      {children}
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 ${className}`}>{children}</div>;
}

function Table({ columns, rows, renderRow, emptyText }) {
  return (
    <Card className="overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4 font-black">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length ? rows.map(renderRow) : (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-slate-500">{emptyText || "No data yet."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function useExpenseBase() {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  const loadBase = async () => {
    const [accountRes, categoryRes] = await Promise.all([
      api.get("/expenses/accounts"),
      api.get("/expenses/categories")
    ]);
    setAccounts(safeArray(accountRes.data.accounts));
    setCategories(safeArray(categoryRes.data.categories));
  };

  return { accounts, categories, loadBase };
}

function AccountForm({ initial, onSubmit }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    account_name: "",
    account_type: "bank",
    owner_type: "company",
    currency: "VND",
    bank_name: "",
    account_number: "",
    opening_balance: 0,
    description: "",
    ...(initial || {})
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form id="expense-account-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="grid gap-4 md:grid-cols-2">
      <Field label={t("accountName")}><input className={inputClass()} value={form.account_name} onChange={(e) => set("account_name", e.target.value)} required /></Field>
      <Field label={t("accountType")}><select className={inputClass()} value={form.account_type} onChange={(e) => set("account_type", e.target.value)}>{accountTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></Field>
      <Field label={t("owner")}><select className={inputClass()} value={form.owner_type} onChange={(e) => set("owner_type", e.target.value)}>{ownerTypes.map((type) => <option key={type.value} value={type.value}>{t(type.labelKey)}</option>)}</select></Field>
      <Field label={t("currency")}><select className={inputClass()} value={form.currency} onChange={(e) => set("currency", e.target.value)}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></Field>
      <Field label={t("bank")}><input className={inputClass()} value={form.bank_name || ""} onChange={(e) => set("bank_name", e.target.value)} /></Field>
      <Field label={t("accountNumber")}><input className={inputClass()} value={form.account_number || ""} onChange={(e) => set("account_number", e.target.value)} /></Field>
      <Field label={t("balance")}><input type="number" step="0.01" className={inputClass()} value={form.opening_balance || 0} onChange={(e) => set("opening_balance", e.target.value)} /></Field>
      <Field label={t("description")}><input className={inputClass()} value={form.description || ""} onChange={(e) => set("description", e.target.value)} /></Field>
    </form>
  );
}

function CategoryForm({ initial, onSubmit }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", description: "", ...(initial || {}) });
  return (
    <form id="expense-category-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="space-y-4">
      <Field label={t("groupName")}><input className={inputClass()} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required /></Field>
      <Field label={t("description")}><textarea className={inputClass()} rows={4} value={form.description || ""} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} /></Field>
    </form>
  );
}

function TransactionForm({ accounts, categories, initial, onSubmit }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    account_id: accounts[0]?.id || "",
    category_id: "",
    amount: "",
    currency: accounts[0]?.currency || "VND",
    transaction_date: new Date().toISOString().slice(0, 10),
    title: "",
    vendor: "",
    note: "",
    debt_status: "",
    ...(initial || {})
  });
  const [attachmentName, setAttachmentName] = useState(initial?.attachment_name || "");
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function attach(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentName(file.name);
      setForm((prev) => ({ ...prev, attachment_name: file.name, attachment_data_url: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <form id="expense-transaction-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="grid gap-4 md:grid-cols-2">
      <Field label={t("name")}><input className={inputClass()} value={form.title} onChange={(e) => set("title", e.target.value)} required /></Field>
      <Field label={t("amount")}><input type="number" step="0.01" className={inputClass()} value={form.amount} onChange={(e) => set("amount", e.target.value)} required /></Field>
      <Field label={t("account")}><select className={inputClass()} value={form.account_id} onChange={(e) => {
        const account = accounts.find((item) => String(item.id) === e.target.value);
        setForm((prev) => ({ ...prev, account_id: e.target.value, currency: account?.currency || prev.currency }));
      }}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.account_name} ({account.currency})</option>)}</select></Field>
      <Field label={t("category")}><select className={inputClass()} value={form.category_id || ""} onChange={(e) => set("category_id", e.target.value)}><option value="">{t("noCategory")}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
      <Field label={t("currency")}><select className={inputClass()} value={form.currency} onChange={(e) => set("currency", e.target.value)}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></Field>
      <Field label={t("date")}><input type="date" className={inputClass()} value={form.transaction_date?.slice(0, 10) || ""} onChange={(e) => set("transaction_date", e.target.value)} /></Field>
      <Field label={t("vendor")}><input className={inputClass()} value={form.vendor || ""} onChange={(e) => set("vendor", e.target.value)} /></Field>
      <Field label={t("debtStatus")}><select className={inputClass()} value={form.debt_status || ""} onChange={(e) => set("debt_status", e.target.value)}><option value="">{t("auto")}</option><option value="none">{t("noDebt")}</option><option value="pending">{t("pendingReimbursement")}</option><option value="paid">{t("paidBack")}</option></select></Field>
      <div className="md:col-span-2">
        <Field label={t("note")}><textarea className={inputClass()} rows={3} value={form.note || ""} onChange={(e) => set("note", e.target.value)} /></Field>
      </div>
      <div className="md:col-span-2">
        <Field label={t("receiptImageFile")}>
          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <span className="inline-flex min-w-0 items-center gap-2"><Camera size={18} /> <span className="truncate">{attachmentName || t("uploadReceipt")}</span></span>
            <input type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={(e) => attach(e.target.files?.[0])} />
          </label>
        </Field>
      </div>
    </form>
  );
}

function RevenueForm({ accounts, initial, onSubmit }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    account_id: accounts[0]?.id || "",
    amount: "",
    currency: accounts[0]?.currency || "VND",
    revenue_date: new Date().toISOString().slice(0, 10),
    revenue_type: "",
    description: "",
    note: "",
    ...(initial || {})
  });
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <form id="expense-revenue-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="grid gap-4 md:grid-cols-2">
      <Field label={t("revenueType")}><input className={inputClass()} value={form.revenue_type || ""} onChange={(e) => set("revenue_type", e.target.value)} placeholder={t("revenuePlaceholder")} required /></Field>
      <Field label={t("amount")}><input type="number" step="0.01" className={inputClass()} value={form.amount} onChange={(e) => set("amount", e.target.value)} required /></Field>
      <Field label={t("account")}><select className={inputClass()} value={form.account_id} onChange={(e) => {
        const account = accounts.find((item) => String(item.id) === e.target.value);
        setForm((prev) => ({ ...prev, account_id: e.target.value, currency: account?.currency || prev.currency }));
      }}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.account_name} ({account.currency})</option>)}</select></Field>
      <Field label={t("currency")}><select className={inputClass()} value={form.currency} onChange={(e) => set("currency", e.target.value)}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></Field>
      <Field label={t("date")}><input type="date" className={inputClass()} value={form.revenue_date?.slice(0, 10) || ""} onChange={(e) => set("revenue_date", e.target.value)} /></Field>
      <Field label={t("description")}><input className={inputClass()} value={form.description || ""} onChange={(e) => set("description", e.target.value)} /></Field>
      <div className="md:col-span-2">
        <Field label={t("note")}><textarea className={inputClass()} rows={3} value={form.note || ""} onChange={(e) => set("note", e.target.value)} /></Field>
      </div>
    </form>
  );
}

export function ExpenseOverviewPage() {
  const { t } = useI18n();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/expenses/overview", { params: { month } });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const totals = Object.entries(data?.totals_by_currency || {});
  const accounts = safeArray(data?.accounts);

  return (
    <PageShell
      badge={t("expense")}
      title={t("expenseOverview")}
      description={t("expenseOverviewDescription")}
      actions={<><input type="month" className={`${inputClass()} w-auto min-w-[180px]`} value={month} onChange={(e) => setMonth(e.target.value)} /><Button variant="ghost" onClick={load}><RefreshCw size={16} /> {t("refresh")}</Button></>}
    >
      {totals.length ? (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {totals.map(([currency, total]) => (
            <Card key={currency} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">{currency}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{money(total.balance, currency)}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-500/10"><WalletCards size={22} /></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-slate-500">{t("revenue")}</p><b>{money(total.revenue, currency)}</b></div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-slate-500">{t("expense")}</p><b>{money(total.expense, currency)}</b></div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-slate-500">{t("monthRevenue")}</p><b>{money(total.month_revenue, currency)}</b></div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-slate-500">{t("monthExpense")}</p><b>{money(total.month_expense, currency)}</b></div>
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState>{loading ? `${t("loading")}...` : t("noAccountData")}</EmptyState>}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <Table
            columns={[t("account"), t("accountType"), t("revenue"), t("expense"), t("balance"), t("monthExpense")]}
            rows={accounts}
            emptyText={t("noAccountData")}
            renderRow={(account) => (
              <tr key={account.id}>
                <td className="px-5 py-4 font-black text-slate-900 dark:text-white">{account.account_name}<div className="text-xs font-normal text-slate-500">{account.owner_type}</div></td>
                <td className="px-5 py-4">{account.account_type}</td>
                <td className="px-5 py-4 text-emerald-700">{money(account.total_revenue, account.currency)}</td>
                <td className="px-5 py-4 text-rose-600">{money(account.total_expense, account.currency)}</td>
                <td className="px-5 py-4 font-black">{money(account.balance, account.currency)}</td>
                <td className="px-5 py-4">{money(account.month_expense, account.currency)}</td>
              </tr>
            )}
          />
        </div>
        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">{t("pendingDebts")}</h3>
            <div className="mt-4 space-y-3">
              {safeArray(data?.pending_debts).slice(0, 8).map((debt) => (
                <div key={debt.id} className="rounded-2xl bg-rose-50 p-3 text-sm dark:bg-rose-500/10">
                  <b>{debt.title}</b>
                  <p className="text-rose-600">{money(debt.amount, debt.currency)}</p>
                  <p className="truncate text-xs text-slate-500">{debt.account_name}</p>
                </div>
              ))}
              {!safeArray(data?.pending_debts).length ? <p className="text-sm text-slate-500">{t("noPendingDebt")}</p> : null}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">{t("topCategories")}</h3>
            <div className="mt-4 space-y-3">
              {safeArray(data?.category_totals).map((item) => (
                <div key={`${item.name}-${item.currency}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
                  <span className="truncate font-bold">{item.name || t("noCategory")}</span>
                  <b>{money(item.total, item.currency)}</b>
                </div>
              ))}
              {!safeArray(data?.category_totals).length ? <p className="text-sm text-slate-500">{t("noCategoryData")}</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

export function ExpenseAccountsPage() {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const load = async () => setAccounts(safeArray((await api.get("/expenses/accounts")).data.accounts));
  useEffect(() => { load(); }, []);
  const save = async (form) => {
    if (editing) await api.put(`/expenses/accounts/${editing.id}`, form);
    else await api.post("/expenses/accounts", form);
    setOpen(false); setEditing(null); await load();
  };
  const remove = async (account) => {
    if (!confirm(`${t("deleteConfirm")} ${account.account_name}?`)) return;
    await api.delete(`/expenses/accounts/${account.id}`);
    await load();
  };
  return (
    <PageShell badge={t("expense")} title={t("accounts")} description={t("expenseOverviewDescription")} actions={<Button variant="green" onClick={() => setOpen(true)}><Plus size={16} /> {t("add")}</Button>}>
      <Table columns={[t("account"), t("owner"), t("currency"), t("revenue"), t("expense"), t("balance"), t("action")]} rows={accounts} renderRow={(account) => (
        <tr key={account.id}>
          <td className="px-5 py-4 font-black">{account.account_name}<div className="text-xs font-normal text-slate-500">{account.bank_name || account.account_type} {account.account_number ? `- ${account.account_number}` : ""}</div></td>
          <td className="px-5 py-4">{account.owner_type}</td>
          <td className="px-5 py-4">{account.currency}</td>
          <td className="px-5 py-4">{money(account.total_revenue, account.currency)}</td>
          <td className="px-5 py-4">{money(account.total_expense, account.currency)}</td>
          <td className="px-5 py-4 font-black">{money(account.balance, account.currency)}</td>
          <td className="px-5 py-4"><div className="flex gap-2"><Button variant="ghost" className="px-3" onClick={() => { setEditing(account); setOpen(true); }}><Edit3 size={15} /></Button><Button variant="danger" className="px-3" onClick={() => remove(account)}><Trash2 size={15} /></Button></div></td>
        </tr>
      )} />
      {open ? <Modal title={editing ? t("editAccount") : t("addAccount")} onClose={() => { setOpen(false); setEditing(null); }} footer={<><Button variant="ghost" onClick={() => { setOpen(false); setEditing(null); }}>{t("cancel")}</Button><Button form="expense-account-form" type="submit">{t("save")}</Button></>}><AccountForm initial={editing} onSubmit={save} /></Modal> : null}
    </PageShell>
  );
}

export function ExpenseCategoriesPage() {
  const { t } = useI18n();
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const load = async () => setCategories(safeArray((await api.get("/expenses/categories")).data.categories));
  useEffect(() => { load(); }, []);
  const save = async (form) => {
    if (editing) await api.put(`/expenses/categories/${editing.id}`, form);
    else await api.post("/expenses/categories", form);
    setOpen(false); setEditing(null); await load();
  };
  const remove = async (category) => {
    if (!confirm(`${t("deleteConfirm")} ${category.name}?`)) return;
    await api.delete(`/expenses/categories/${category.id}`);
    await load();
  };
  return (
    <PageShell badge={t("expense")} title={t("expenseGroups")} description={t("description")} actions={<Button variant="green" onClick={() => setOpen(true)}><Plus size={16} /> {t("add")}</Button>}>
      <Table columns={[t("group"), t("description"), t("transactions"), t("expense"), t("action")]} rows={categories} renderRow={(category) => (
        <tr key={category.id}>
          <td className="px-5 py-4 font-black">{category.name}</td>
          <td className="px-5 py-4 text-slate-500">{category.description || "-"}</td>
          <td className="px-5 py-4">{category.transaction_count || 0}</td>
          <td className="px-5 py-4">{money(category.total_spent, "VND")}</td>
          <td className="px-5 py-4"><div className="flex gap-2"><Button variant="ghost" className="px-3" onClick={() => { setEditing(category); setOpen(true); }}><Edit3 size={15} /></Button><Button variant="danger" className="px-3" onClick={() => remove(category)}><Trash2 size={15} /></Button></div></td>
        </tr>
      )} />
      {open ? <Modal title={editing ? t("editExpenseGroup") : t("addExpenseGroup")} onClose={() => { setOpen(false); setEditing(null); }} footer={<><Button variant="ghost" onClick={() => { setOpen(false); setEditing(null); }}>{t("cancel")}</Button><Button form="expense-category-form" type="submit">{t("save")}</Button></>}><CategoryForm initial={editing} onSubmit={save} /></Modal> : null}
    </PageShell>
  );
}

export function ExpenseTransactionsPage() {
  const { t } = useI18n();
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const { accounts, categories, loadBase } = useExpenseBase();
  const load = async () => setRows(safeArray((await api.get("/expenses/transactions", { params: { month } })).data.transactions));
  useEffect(() => { loadBase(); }, []);
  useEffect(() => { load(); }, [month]);
  const save = async (form) => {
    if (editing) await api.put(`/expenses/transactions/${editing.id}`, form);
    else await api.post("/expenses/transactions", form);
    setOpen(false); setEditing(null); await load(); await loadBase();
  };
  const remove = async (row) => {
    if (!confirm(`${t("deleteConfirm")} ${row.title}?`)) return;
    await api.delete(`/expenses/transactions/${row.id}`);
    await load();
  };
  return (
    <PageShell badge={t("expense")} title={t("transactions")} description={t("pendingDebts")} actions={<><input type="month" className={`${inputClass()} w-auto min-w-[160px]`} value={month} onChange={(e) => setMonth(e.target.value)} /><Button variant="green" disabled={!accounts.length} onClick={() => setOpen(true)}><Plus size={16} /> {t("add")}</Button></>}>
      {!accounts.length ? <EmptyState>{t("noAccountData")}</EmptyState> : null}
      <Table columns={[t("date"), t("expense"), t("account"), t("category"), t("amount"), t("debtStatus"), t("by"), t("action")]} rows={rows} renderRow={(row) => (
        <tr key={row.id}>
          <td className="px-5 py-4">{row.transaction_date}</td>
          <td className="px-5 py-4 font-black">{row.title}<div className="text-xs font-normal text-slate-500">{row.vendor || row.note || "-"}</div></td>
          <td className="px-5 py-4">{row.account_name}</td>
          <td className="px-5 py-4">{row.category_name || "-"}</td>
          <td className="px-5 py-4 font-black text-rose-600">{money(row.amount, row.currency)}</td>
          <td className="px-5 py-4">{row.debt_status}</td>
          <td className="px-5 py-4 text-xs text-slate-500">{t("created")}: {row.created_by_name || "-"}<br />{t("updated")}: {row.updated_by_name || "-"}</td>
          <td className="px-5 py-4"><div className="flex gap-2"><Button variant="ghost" className="px-3" onClick={() => { setEditing(row); setOpen(true); }}><Edit3 size={15} /></Button><Button variant="danger" className="px-3" onClick={() => remove(row)}><Trash2 size={15} /></Button></div></td>
        </tr>
      )} />
      {open ? <Modal title={editing ? t("editTransaction") : t("addTransaction")} onClose={() => { setOpen(false); setEditing(null); }} footer={<><Button variant="ghost" onClick={() => { setOpen(false); setEditing(null); }}>{t("cancel")}</Button><Button form="expense-transaction-form" type="submit">{t("save")}</Button></>}><TransactionForm accounts={accounts} categories={categories} initial={editing} onSubmit={save} /></Modal> : null}
    </PageShell>
  );
}

export function ExpenseRevenuePage() {
  const { t } = useI18n();
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const { accounts, loadBase } = useExpenseBase();
  const load = async () => setRows(safeArray((await api.get("/expenses/revenues", { params: { month } })).data.revenues));
  useEffect(() => { loadBase(); }, []);
  useEffect(() => { load(); }, [month]);
  const save = async (form) => {
    if (editing) await api.put(`/expenses/revenues/${editing.id}`, form);
    else await api.post("/expenses/revenues", form);
    setOpen(false); setEditing(null); await load(); await loadBase();
  };
  const remove = async (row) => {
    if (!confirm(`${t("deleteConfirm")} ${row.revenue_type}?`)) return;
    await api.delete(`/expenses/revenues/${row.id}`);
    await load();
  };
  return (
    <PageShell badge={t("expense")} title={t("revenue")} description={t("monthRevenue")} actions={<><input type="month" className={`${inputClass()} w-auto min-w-[160px]`} value={month} onChange={(e) => setMonth(e.target.value)} /><Button variant="green" disabled={!accounts.length} onClick={() => setOpen(true)}><Plus size={16} /> {t("add")}</Button></>}>
      {!accounts.length ? <EmptyState>{t("noAccountData")}</EmptyState> : null}
      <Table columns={[t("date"), t("accountType"), t("account"), t("amount"), t("description"), t("by"), t("action")]} rows={rows} renderRow={(row) => (
        <tr key={row.id}>
          <td className="px-5 py-4">{row.revenue_date}</td>
          <td className="px-5 py-4 font-black">{row.revenue_type}</td>
          <td className="px-5 py-4">{row.account_name}</td>
          <td className="px-5 py-4 font-black text-emerald-700">{money(row.amount, row.currency)}</td>
          <td className="px-5 py-4 text-slate-500">{row.description || row.note || "-"}</td>
          <td className="px-5 py-4 text-xs text-slate-500">{t("created")}: {row.created_by_name || "-"}<br />{t("updated")}: {row.updated_by_name || "-"}</td>
          <td className="px-5 py-4"><div className="flex gap-2"><Button variant="ghost" className="px-3" onClick={() => { setEditing(row); setOpen(true); }}><Edit3 size={15} /></Button><Button variant="danger" className="px-3" onClick={() => remove(row)}><Trash2 size={15} /></Button></div></td>
        </tr>
      )} />
      {open ? <Modal title={editing ? t("editRevenue") : t("addRevenue")} onClose={() => { setOpen(false); setEditing(null); }} footer={<><Button variant="ghost" onClick={() => { setOpen(false); setEditing(null); }}>{t("cancel")}</Button><Button form="expense-revenue-form" type="submit">{t("save")}</Button></>}><RevenueForm accounts={accounts} initial={editing} onSubmit={save} /></Modal> : null}
    </PageShell>
  );
}
