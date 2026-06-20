import { useEffect, useState } from "react";
import { Crown, Eye, EyeOff, KeyRound, Loader2, Lock, LogOut, Mail, Plus, Search, ShieldCheck, Trash2, Unlock, UserRound, Users, X } from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const ROLE_OPTIONS = ["admin", "Account", "Read Only", "user"];
const SUPER_ADMIN_ROLES = ["supper admin", "super admin"];

function roleList(item) {
  if (Array.isArray(item?.roles)) return item.roles.filter(Boolean);
  const raw = String(item?.role || "").trim();
  if (!raw) return ["user"];
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [raw];
    } catch {
      return [raw];
    }
  }
  return [raw];
}

function hasRole(item, role) {
  return roleList(item).some((value) => String(value).toLowerCase() === String(role).toLowerCase());
}

function isSuperAdminAccount(item) {
  return roleList(item).some((role) => SUPER_ADMIN_ROLES.includes(String(role || "").trim().toLowerCase()));
}

export default function AccountPage() {
  const { user, logout, isAdmin, canViewAccount } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingRole, setPendingRole] = useState({});
  const [resetTarget, setResetTarget] = useState(null);
  const [resetForm, setResetForm] = useState({ password: "", confirm_password: "" });
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [query, setQuery] = useState("");

  const filteredUsers = users.filter((item) => {
    const haystack = `${item.full_name || ""} ${item.email || ""} ${roleList(item).join(" ")}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  async function fetchUsers() {
    if (!canViewAccount) return;

    try {
      setLoadingUsers(true);
      const usersRes = await api.get("/auth/users");
      setUsers((usersRes.data.data || []).filter((item) => !isSuperAdminAccount(item)));
    } catch (error) {
      setMessage(error.response?.data?.message || "Khong the tai danh sach user");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function updateRoles(id, roles) {
    try {
      await api.put(`/auth/users/${id}/role`, { roles });
      setMessage("Da cap nhat quyen user");
      fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || "Loi cap nhat quyen user");
    }
  }

  function addRole(item) {
    const nextRole = pendingRole[item.id];
    if (!nextRole) return;

    let nextRoles = roleList(item);
    if (nextRole === "admin") {
      nextRoles = nextRoles.includes("Read Only") ? ["admin", "Read Only"] : ["admin"];
    } else {
      nextRoles = nextRoles.filter((role) => role !== "admin" && role !== "user");
      nextRoles = [...new Set([...nextRoles, nextRole])];
    }

    updateRoles(item.id, nextRoles);
    setPendingRole((current) => ({ ...current, [item.id]: "" }));
  }

  function removeRole(item, role) {
    const nextRoles = roleList(item).filter((value) => value !== role);
    updateRoles(item.id, nextRoles.length ? nextRoles : ["user"]);
  }

  async function updateStatus(id, status) {
    try {
      await api.put(`/auth/users/${id}/status`, { status });
      setMessage("Da cap nhat trang thai user");
      fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || "Loi cap nhat trang thai user");
    }
  }

  function assignableRoleOptions(item) {
    return ROLE_OPTIONS.filter((role) => (isAdmin || role !== "admin") && !roleList(item).includes(role));
  }

  function canRemoveRole(role) {
    return role !== "admin";
  }

  async function deleteUser(id) {
    const ok = window.confirm("Ban co chac muon xoa user nay khong?");
    if (!ok) return;

    try {
      await api.delete(`/auth/users/${id}`);
      setMessage("Da xoa user");
      fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || "Loi xoa user");
    }
  }

  function openResetPassword(item) {
    setResetTarget(item);
    setResetForm({ password: "", confirm_password: "" });
    setShowResetPassword(false);
    setShowResetConfirm(false);
    setMessage("");
  }

  async function resetUserPassword(event) {
    event.preventDefault();
    if (!resetTarget) return;

    if (resetForm.password !== resetForm.confirm_password) {
      setMessage("Password confirmation does not match");
      return;
    }

    try {
      setResetLoading(true);
      await api.put(`/auth/users/${resetTarget.id}/reset-password`, resetForm);
      setMessage(`Password reset for ${resetTarget.full_name || resetTarget.email}`);
      setResetTarget(null);
      setResetForm({ password: "", confirm_password: "" });
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not reset user password");
    } finally {
      setResetLoading(false);
    }
  }

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  useEffect(() => {
    fetchUsers();
    // Reload users when account access becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewAccount]);

  return (
    <div className="p-5 lg:p-8">
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600">
            <UserRound size={18} />
            Account
          </div>
          <h1 className="text-3xl font-black text-slate-900 lg:text-4xl">Account Settings</h1>
          <p className="mt-2 text-slate-500">Quan ly tai khoan, phan quyen va bao mat nguoi dung.</p>
        </div>

        <button onClick={handleLogout} className="flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 py-3 font-bold text-red-600 hover:bg-red-100">
          <LogOut size={18} />
          Dang xuat
        </button>
      </div>

      {message && <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 font-medium text-blue-700">{message}</div>}

      <div className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <UserRound size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{user?.full_name}</h3>
          <div className="mt-3 flex items-center gap-2 text-slate-500">
            <Mail size={17} />
            <span>{user?.email}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
            <Crown size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Quyen hien tai</h3>
          <div className="mt-3 inline-flex rounded-full bg-slate-900 px-4 py-2 font-bold uppercase text-white">
            {(user?.roles || [user?.role]).filter(Boolean).join(", ")}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Trang thai</h3>
          <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-4 py-2 font-bold uppercase text-emerald-700">{user?.status}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="text-blue-600" size={22} />
              <h2 className="text-xl font-black text-slate-900">User Management</h2>
            </div>
            <p className="mt-1 text-slate-500">Admin va Account role duoc phan quyen user.</p>
          </div>

          <label className="flex min-w-[260px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users..." className="w-full bg-transparent outline-none" />
          </label>

          {loadingUsers && <Loader2 className="animate-spin text-blue-600" size={26} />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-500">
                <th className="p-4">ID</th>
                <th className="p-4">Full Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-700">#{item.id}</td>
                  <td className="p-4 font-bold text-slate-900">{item.full_name}</td>
                  <td className="p-4 text-slate-600">{item.email}</td>
                  <td className="min-w-[300px] p-4">
                    <div className="flex flex-wrap gap-2">
                      {roleList(item).map((role) => (
                        <span key={role} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                          {role}
                          {item.id !== user.id && canRemoveRole(role) && (
                            <button type="button" onClick={() => removeRole(item, role)} className="text-blue-400 hover:text-red-500">
                              <X size={13} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {item.id !== user.id && (
                      <div className="mt-2 flex gap-2">
                        <select
                          value={pendingRole[item.id] || ""}
                          onChange={(event) => setPendingRole((current) => ({ ...current, [item.id]: event.target.value }))}
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold"
                        >
                          <option value="">Add role</option>
                          {assignableRoleOptions(item).map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                        <button type="button" onClick={() => addRole(item)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                          <Plus size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={["rounded-full px-3 py-1 text-xs font-black uppercase", item.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"].join(" ")}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">{item.created_at}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {item.status === "active" ? (
                        <button onClick={() => updateStatus(item.id, "blocked")} disabled={item.id === user.id} className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-50" title="Khoa user">
                          <Lock size={16} />
                        </button>
                      ) : (
                        <button onClick={() => updateStatus(item.id, "active")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Mo khoa">
                          <Unlock size={16} />
                        </button>
                      )}
                      <button onClick={() => openResetPassword(item)} disabled={item.id === user.id || (!isAdmin && hasRole(item, "admin"))} className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50" title="Reset password">
                        <KeyRound size={16} />
                      </button>
                      <button onClick={() => deleteUser(item.id)} disabled={item.id === user.id} className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50" title="Xoa">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!filteredUsers.length && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">Chua co user nao.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={resetUserPassword} className="w-full max-w-[520px] rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Reset password</h2>
                <p className="mt-1 text-sm text-slate-500">{resetTarget.full_name} - {resetTarget.email}</p>
              </div>
              <button type="button" onClick={() => setResetTarget(null)} className="rounded-2xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">New password</span>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500">
                  <KeyRound size={20} className="text-slate-400" />
                  <input type={showResetPassword ? "text" : "password"} value={resetForm.password} onChange={(event) => setResetForm((current) => ({ ...current, password: event.target.value }))} required className="w-full bg-transparent outline-none" />
                  <button type="button" onClick={() => setShowResetPassword((value) => !value)} className="text-slate-400">
                    {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Confirm password</span>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500">
                  <KeyRound size={20} className="text-slate-400" />
                  <input type={showResetConfirm ? "text" : "password"} value={resetForm.confirm_password} onChange={(event) => setResetForm((current) => ({ ...current, confirm_password: event.target.value }))} required className="w-full bg-transparent outline-none" />
                  <button type="button" onClick={() => setShowResetConfirm((value) => !value)} className="text-slate-400">
                    {showResetConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
              <button type="button" onClick={() => setResetTarget(null)} className="rounded-2xl border border-slate-200 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button disabled={resetLoading} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-60">
                {resetLoading && <Loader2 size={18} className="animate-spin" />}
                Save password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
