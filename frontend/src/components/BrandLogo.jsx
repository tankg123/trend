import { useSystemSettings } from "../context/SystemSettingsContext";

export default function BrandLogo({ settings: previewSettings, className = "" }) {
  const { settings, logoColor } = useSystemSettings();
  const branding = previewSettings || settings;
  const useUploadedLogo = branding.logo_mode === "upload" && branding.logo_data_url;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{ backgroundColor: useUploadedLogo ? "transparent" : logoColor }}
    >
      <img
        src={useUploadedLogo ? branding.logo_data_url : "/content-owner-icon.png"}
        alt={branding.brand_name || "ANS Network"}
        className={`h-full w-full ${useUploadedLogo ? "object-cover" : "object-contain"}`}
      />
    </div>
  );
}
