import { useRef, useState } from "react";
import { Camera, Clipboard, Copy, FileImage, ImageUp, Languages, Loader2, RefreshCw, X } from "lucide-react";
import api from "../api/api";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function languageLabel(value) {
  if (!value) return "-";
  return value;
}

export default function TranslatePage() {
  const [sourceText, setSourceText] = useState("");
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [loadingText, setLoadingText] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [lastAction, setLastAction] = useState("");
  const lastRequestRef = useRef("");

  async function translateText(text = sourceText.trim()) {
    if (!text) {
      setMessage("Please enter text to translate.");
      return;
    }

    if (lastRequestRef.current === text && result?.translatedText) return;
    lastRequestRef.current = text;

    try {
      setLoadingText(true);
      setMessage("");
      setLastAction("text");
      const response = await api.post("/translate/text", { text }, { timeout: 70000 });
      setResult(response.data.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not translate text.");
    } finally {
      setLoadingText(false);
    }
  }

  async function translateImageDataUrl(nextImageDataUrl) {
    try {
      setLoadingImage(true);
      setMessage("");
      setLastAction("image");
      const response = await api.post("/translate/image", { imageDataUrl: nextImageDataUrl }, { timeout: 90000 });
      const data = response.data.data;
      setResult(data);
      setSourceText(data.sourceText || "");
      lastRequestRef.current = data.sourceText || "";
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not read and translate image.");
    } finally {
      setLoadingImage(false);
    }
  }

  async function translateImageFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }

    const nextImageDataUrl = await fileToDataUrl(file);
    setImageDataUrl(nextImageDataUrl);
    setImagePreview(nextImageDataUrl);
    translateImageDataUrl(nextImageDataUrl);
  }

  function retryLastAction() {
    if (lastAction === "image" && imageDataUrl) {
      translateImageDataUrl(imageDataUrl);
      return;
    }

    translateText();
  }

  function handleTextChange(event) {
    setSourceText(event.target.value);
    setMessage("");
  }

  function handlePaste(event) {
    const items = Array.from(event.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    translateImageFile(file);
  }

  async function copyTranslatedText() {
    const text = result?.translatedText || "";
    if (!text) {
      setMessage("No translation to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied translated text.");
    } catch {
      setMessage("Clipboard was blocked. Please select and copy manually.");
    }
  }

  function clearAll() {
    setSourceText("");
    setResult(null);
    setImagePreview("");
    setImageDataUrl("");
    setMessage("");
    setLastAction("");
    lastRequestRef.current = "";
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-600">
          <Languages size={18} />
          Translate
        </div>
        <h1 className="text-3xl font-black text-slate-950 lg:text-4xl">Translate</h1>
        <p className="mt-2 text-slate-500">Vietnamese to English, English to Vietnamese, plus image OCR translation.</p>
      </div>

      <section className="mb-6 grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Input</h2>
              <p className="mt-1 text-sm text-slate-500">Type text, paste an image, upload an image, or take a photo.</p>
            </div>
            <button type="button" onClick={clearAll} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" title="Clear">
              <X size={18} />
            </button>
          </div>

          <textarea
            value={sourceText}
            onChange={handleTextChange}
            onPaste={handlePaste}
            placeholder="Type Vietnamese or English, then click Translate Now. You can also paste an image here."
            className="min-h-72 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 leading-7 outline-none focus:border-blue-500"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => translateText()} disabled={loadingText || !sourceText.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-60">
              {loadingText ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
              Translate Now
            </button>

            <button type="button" onClick={clearAll} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900">
              <X size={16} />
              Clear
            </button>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">
              <ImageUp size={18} />
              Upload Image
              <input type="file" accept="image/*" onChange={(event) => translateImageFile(event.target.files?.[0])} className="hidden" />
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">
              <Camera size={18} />
              Take Photo
              <input type="file" accept="image/*" capture="environment" onChange={(event) => translateImageFile(event.target.files?.[0])} className="hidden" />
            </label>
          </div>

          {loadingImage && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 font-bold text-emerald-700">
              <Loader2 className="animate-spin" size={18} />
              Reading image and translating...
            </div>
          )}

          {imagePreview && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <img src={imagePreview} alt="Selected text source" className="max-h-[360px] w-full object-contain" />
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Translation</h2>
              <p className="mt-1 text-sm text-slate-500">
                {result ? `${languageLabel(result.detectedLanguage)} -> ${languageLabel(result.targetLanguage)}` : "Waiting for input..."}
              </p>
            </div>
            <button type="button" onClick={copyTranslatedText} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">
              <Copy size={18} />
              Copy
            </button>
          </div>

          <div className="min-h-72 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {loadingText ? (
              <div className="flex h-56 items-center justify-center gap-2 font-bold text-blue-600">
                <Loader2 className="animate-spin" size={22} />
                Translating...
              </div>
            ) : result?.translatedText ? (
              <p className="whitespace-pre-wrap break-words text-lg leading-8 text-slate-950">{result.translatedText}</p>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center text-center text-slate-400">
                <Clipboard size={36} />
                <p className="mt-3 font-bold">Your translation will appear here.</p>
              </div>
            )}
          </div>

          {result?.sourceText && (
            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-500">
                <FileImage size={16} />
                Detected / Source text
              </div>
              <p className="max-h-44 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{result.sourceText}</p>
            </div>
          )}
        </div>
      </section>

      {message && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 font-bold text-blue-700">
          <span>{message}</span>
          {(sourceText.trim() || imageDataUrl) && (
            <button
              type="button"
              onClick={retryLastAction}
              disabled={loadingText || loadingImage}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {(loadingText || loadingImage) ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />}
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
