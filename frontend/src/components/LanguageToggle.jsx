import { Languages } from "lucide-react";
import { useI18n } from "../context/I18nContext";

export default function LanguageToggle({ compact = false, dark = false }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={[
        "inline-flex items-center gap-1 rounded-2xl border p-1",
        dark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
        compact ? "" : "w-full"
      ].join(" ")}
      title={t("language")}
    >
      {!compact && <Languages size={16} className={dark ? "ml-2 text-slate-300" : "ml-2 text-slate-500"} />}
      {["en", "vi"].map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLanguage(item)}
          className={[
            "rounded-xl px-3 py-2 text-xs font-black transition",
            language === item
              ? "bg-blue-600 text-white"
              : dark
                ? "text-slate-300 hover:bg-slate-700"
                : "text-slate-500 hover:bg-slate-100"
          ].join(" ")}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
