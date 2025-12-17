import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";

// --- Global Type for AI Studio ---
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

// --- Icons (SVGs) ---
const Icons = {
  Upload: ({ size = "h-8 w-8" }: { size?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`${size} text-indigo-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Sparkles: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Magic: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  Delete: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Key: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  )
};

// --- Config ---
const MODEL_TEXT = "gemini-3-pro-preview";
const MODEL_TEXT_FALLBACK = "gemini-2.5-flash";
const MODEL_IMAGE = "gemini-3-pro-image-preview";
const MODEL_IMAGE_FALLBACK = "gemini-2.5-flash-image";
const MAX_CHARS = 1000;

// --- Types ---
type Scene = {
  id: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
};

// --- Constants ---
const SCENES: Scene[] = [
  { id: "catalog", name: "Catalog Ready", description: "Clean studio product photography", icon: "📋", gradient: "from-gray-100 to-gray-200" },
  { id: "sunny", name: "Sunny Photoshoot", description: "Golden hour outdoor aesthetic", icon: "☀️", gradient: "from-orange-100 to-amber-200" },
  { id: "studio", name: "Studio Lighting", description: "Dramatic controlled lighting", icon: "💡", gradient: "from-slate-200 to-slate-300" },
  { id: "magazine", name: "Magazine Cover", description: "High-fashion editorial style", icon: "📰", gradient: "from-pink-100 to-rose-200" },
  { id: "insta-ad", name: "Social Ad", description: "High conversion social format", icon: "📱", gradient: "from-blue-100 to-indigo-200" },
  { id: "insta-post", name: "Social Post", description: "Authentic lifestyle vibe", icon: "🤳", gradient: "from-purple-100 to-fuchsia-200" },
  { id: "billboard", name: "Billboard US", description: "Impactful large-format style", icon: "🏙️", gradient: "from-emerald-100 to-teal-200" },
];

// --- Components ---

// 1. Modern Image Upload Slot
const ImageUpload = ({
  label,
  subLabel,
  image,
  onUpload,
  onRemove,
  required = false,
  size = "large",
}: {
  label: string;
  subLabel?: string;
  image: string | null;
  onUpload: (base64: string) => void;
  onRemove: () => void;
  required?: boolean;
  size?: "large" | "small";
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please upload a valid image file.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isSmall = size === "small";

  return (
    <div className={`mb-4 group w-full ${isSmall ? "flex-1" : ""}`}>
      <div className="flex justify-between items-baseline mb-2">
        <h3 className={`font-bold text-slate-800 tracking-tight ${isSmall ? "text-xs" : "text-sm"}`}>{label}</h3>
        {required ? (
          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-md text-[9px] font-extrabold uppercase tracking-wider border border-rose-100">Required</span>
        ) : (
          <span className="text-[10px] font-semibold text-slate-400">Optional</span>
        )}
      </div>
      
      <div
        className={`relative w-full aspect-[4/3] rounded-2xl transition-all duration-300 overflow-hidden shadow-sm
        ${image ? "ring-0" : "border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-400 cursor-pointer"}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        
        {image ? (
          <div className="relative w-full h-full group/image">
            <img src={image} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="px-3 py-1.5 bg-white text-slate-900 rounded-full text-[10px] font-bold shadow-lg hover:scale-105"
               >
                 Change
               </button>
               {!required && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); onRemove(); }}
                   className="p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:scale-105"
                 >
                   <Icons.Delete />
                 </button>
               )}
            </div>
          </div>
        ) : (
          <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
            <div className={`${isSmall ? "p-1.5" : "p-3"} bg-white rounded-xl shadow-sm mb-2 group-hover:scale-110 group-hover:shadow-md transition-all`}>
              <Icons.Upload size={isSmall ? "h-5 w-5" : "h-8 w-8"} />
            </div>
            <p className={`${isSmall ? "text-[10px]" : "text-xs"} font-bold text-slate-600 group-hover:text-indigo-600`}>Tap to upload</p>
            {!isSmall && subLabel && <p className="text-[10px] mt-0.5 text-slate-400 font-medium">{subLabel}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---
function App() {
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [step, setStep] = useState<number>(0);
  
  // State
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [sceneRefImage, setSceneRefImage] = useState<string | null>(null);
  const [modelRefImage, setModelRefImage] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [visionText, setVisionText] = useState("");
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [usedModelName, setUsedModelName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setApiKeyReady(hasKey);
    } else {
      setApiKeyReady(true);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      checkApiKey();
    }
  };

  const handleNext = () => {
    if (step === 0 && !mainImage) {
      alert("Please upload the main item photo to continue.");
      return;
    }
    if (step === 1 && !selectedScene) {
      alert("Please select a scene to continue.");
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setStep(s => Math.max(0, s - 1));
  };

  const handleEnhancePrompt = async () => {
    if (!visionText.trim()) return;
    setIsEnhancingPrompt(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `You are a creative director. Rewrite and enhance the following user request into a detailed, artistic image generation prompt (under 800 chars).
      User Request: "${visionText}"
      Selected Style: "${SCENES.find(s => s.id === selectedScene)?.name}"`;

      try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt
        });
        if (response.text) setVisionText(response.text.trim());
      } catch (e) {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT_FALLBACK,
            contents: prompt
        });
        if (response.text) setVisionText(response.text.trim());
      }
    } catch (e: any) {
      console.error("Enhancement failed", e);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (!mainImage || !selectedScene) return;
    setIsGenerating(true);
    setError(null);
    setStep(3);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const scene = SCENES.find(s => s.id === selectedScene);
      const parts: any[] = [{
        inlineData: { mimeType: "image/jpeg", data: mainImage.split(",")[1] }
      }];
      if (sceneRefImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: sceneRefImage.split(",")[1] } });
      if (modelRefImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: modelRefImage.split(",")[1] } });

      let promptText = `Transform the product photo. Style: ${scene?.name}. Vision: ${visionText}. Photorealistic 4k, identical product features.`;
      parts.push({ text: promptText });

      let response;
      let usedModel = "";
      try {
         usedModel = "Gemini 3 Pro Image";
         response = await ai.models.generateContent({ model: MODEL_IMAGE, contents: { role: "user", parts } });
      } catch (e: any) {
         usedModel = "Gemini 2.5 Flash Image";
         response = await ai.models.generateContent({ model: MODEL_IMAGE_FALLBACK, contents: { role: "user", parts } });
      }
      
      let foundImage = null;
      if (response && response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            foundImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (foundImage) {
        setGeneratedImage(foundImage);
        setUsedModelName(usedModel);
      } else {
        setError("The AI could not generate an image. Please try a different description.");
        setStep(2); 
      }
    } catch (e: any) {
      if (e.status === 403 || e.message?.includes("PERMISSION_DENIED")) {
        setError("Permission denied. Check your API Key.");
        setApiKeyReady(false);
      } else {
        setError("Generation error. Please try again.");
      }
      setStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  const Header = () => (
    <div className="px-6 py-5 bg-white/90 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between sticky top-0 z-20 h-[80px]">
      {step > 0 ? (
        <button onClick={handleBack} className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-50">
          <Icons.ChevronLeft />
        </button>
      ) : <div className="w-10"></div>}
      
      <div className="flex-1 text-center">
         <div className="flex flex-col items-center">
            <span className="font-extrabold text-slate-900 text-sm tracking-tight leading-none">
              Sakshay International
            </span>
            <span className="text-indigo-600 font-black text-xs uppercase tracking-widest mt-0.5">
              AI Studio
            </span>
         </div>
      </div>
      
      <div className="w-10"></div>
    </div>
  );

  const renderStep0_Upload = () => (
    <div className="px-6 pt-8 pb-12 animate-fadeIn max-w-4xl mx-auto">
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Upload Assets</h2>
        <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
          The foundation of your masterpiece. Upload your core product image and optional references for environment or poses.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-12">
        {/* Main Image Section */}
        <div className="flex-[1.5]">
          <ImageUpload
            label="Main Product"
            subLabel="The high-resolution star of the show"
            image={mainImage}
            onUpload={setMainImage}
            onRemove={() => setMainImage(null)}
            required
          />
        </div>

        {/* Reference Images Section */}
        <div className="flex-1 flex flex-col sm:flex-row md:flex-col gap-4">
            <ImageUpload
              label="Scene Ref"
              subLabel="Aesthetics"
              image={sceneRefImage}
              onUpload={setSceneRefImage}
              onRemove={() => setSceneRefImage(null)}
              size="small"
            />
            <ImageUpload
              label="Model Ref"
              subLabel="Poses"
              image={modelRefImage}
              onUpload={setModelRefImage}
              onRemove={() => setModelRefImage(null)}
              size="small"
            />
        </div>
      </div>

      <div className="mt-12 bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50">
        <h4 className="font-bold text-indigo-900 text-sm mb-2 flex items-center gap-2">
          <Icons.Sparkles />
          Pro Tip
        </h4>
        <p className="text-indigo-700/80 text-xs leading-relaxed">
          Use high-resolution photos with good lighting. The better the source image, the more photorealistic the AI transformation will be.
        </p>
      </div>
    </div>
  );

  const renderStep1_Scene = () => (
    <div className="px-6 pt-8 pb-12 animate-fadeIn max-w-6xl mx-auto">
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 text-center md:text-left">Select Style</h2>
        <p className="text-slate-500 font-medium text-sm md:text-base text-center md:text-left">Choose a professional aesthetic for your product photoshoot.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {SCENES.map((scene) => (
          <button
            key={scene.id}
            onClick={() => setSelectedScene(scene.id)}
            className={`p-6 rounded-[32px] text-left transition-all duration-300 relative overflow-hidden group
              ${selectedScene === scene.id 
                ? "ring-4 ring-indigo-500/20 bg-white shadow-2xl scale-[1.03] border-indigo-500" 
                : "bg-white hover:bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl"
              }`}
          >
            <div className={`w-14 h-14 rounded-2xl mb-5 flex items-center justify-center text-3xl bg-gradient-to-br ${scene.gradient} shadow-inner`}>
              {scene.icon}
            </div>
            
            <h3 className={`font-bold mb-1.5 ${selectedScene === scene.id ? "text-indigo-900" : "text-slate-900"}`}>{scene.name}</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold uppercase tracking-tight">{scene.description}</p>
            
            {selectedScene === scene.id && (
              <div className="absolute top-4 right-4 bg-indigo-600 rounded-full p-1.5 animate-scaleIn shadow-lg">
                <Icons.Check />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2_Vision = () => (
    <div className="px-6 pt-8 pb-12 animate-fadeIn max-w-4xl mx-auto">
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Creative Vision</h2>
        <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
          Describe specific details, moods, or objects you'd like to see. Our AI will blend these with your selected style.
        </p>
      </div>

      <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-2xl border border-slate-50 mb-6 relative overflow-hidden">
        <div className="flex items-center gap-5 mb-8 pb-8 border-b border-slate-100">
           {mainImage && (
             <div className="relative shrink-0">
               <img src={mainImage} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-slate-50 shadow-md" />
               <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-[9px] px-2 py-1 rounded-full font-black border-2 border-white shadow-sm">
                 SRC
               </div>
             </div>
           )}
           <div>
             <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1">Active Style</span>
             <p className="text-xl font-black text-slate-900 tracking-tight">{SCENES.find(s => s.id === selectedScene)?.name}</p>
           </div>
        </div>

        <div className="relative">
          <textarea
            value={visionText}
            onChange={(e) => setVisionText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="E.g., Soft morning light filtering through a window, minimalist marble surface, high-end commercial feel..."
            disabled={isEnhancingPrompt}
            className="w-full h-56 md:h-72 p-6 bg-slate-50 rounded-3xl border-0 text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all resize-none leading-relaxed text-sm md:text-lg font-medium"
          />
          
          <button 
            onClick={handleEnhancePrompt}
            disabled={!visionText.trim() || isEnhancingPrompt}
            className={`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all shadow-md
              ${!visionText.trim() ? "opacity-50 cursor-not-allowed bg-slate-200 text-slate-400" : "bg-slate-900 text-white hover:bg-black hover:scale-105"}`}
          >
            {isEnhancingPrompt ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icons.Sparkles />}
            {isEnhancingPrompt ? "Enhancing..." : "Magic Optimize"}
          </button>
        </div>

        <div className="mt-4 flex justify-between items-center px-2">
          <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest">
             AI Logic Enabled
          </span>
          <span className={`text-xs font-bold ${visionText.length >= MAX_CHARS ? "text-rose-500" : "text-slate-300"}`}>
            {visionText.length}/{MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  );

  const renderStep3_Result = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center animate-fadeIn">
          <div className="relative w-32 h-32 mb-10">
            <div className="absolute inset-0 border-8 border-slate-50 rounded-full"></div>
            <div className="absolute inset-0 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-4xl">✨</div>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Crafting Your Visual</h2>
          <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
            Applying {SCENES.find(s => s.id === selectedScene)?.name} lighting and texture using Gemini Vision...
          </p>
        </div>
      );
    }

    if (error) {
       return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center animate-fadeIn">
           <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[40px] flex items-center justify-center mb-8 shadow-sm">
             <span className="text-4xl">⚠️</span>
           </div>
           <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Visual Engine Error</h3>
           <p className="text-slate-500 mb-10 leading-relaxed font-medium">{error}</p>
           <button 
             onClick={() => error.includes("Key") ? handleSelectKey() : setStep(2)}
             className="px-10 py-5 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
           >
             {error.includes("Key") ? "Connect Project" : "Retry Engine"}
           </button>
        </div>
       )
    }

    return (
      <div className="px-6 pt-10 pb-12 animate-fadeIn flex flex-col items-center max-w-5xl mx-auto">
         <div className="mb-10 text-center">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Final Masterpiece</h2>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">{usedModelName} Processing</p>
         </div>

         <div className="w-full relative rounded-[40px] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] ring-8 ring-white bg-slate-50">
           {generatedImage && <img src={generatedImage} className="w-full h-auto object-cover" alt="Generated" />}
         </div>

         <div className="mt-12 w-full max-w-lg flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="flex-1 py-5 rounded-3xl font-black text-sm uppercase tracking-widest bg-white text-slate-900 border-2 border-slate-100 hover:bg-slate-50"
            >
              Start Over
            </button>
            <a 
              href={generatedImage || "#"}
              download="enhanced-photo.jpg"
              className="flex-[1.5] py-5 rounded-3xl font-black text-sm uppercase tracking-widest bg-indigo-600 text-white flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02]"
            >
              Export Visual
            </a>
         </div>
      </div>
    );
  };

  return (
    <div className="ios-container no-scrollbar">
      <Header />
      
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        {step === 0 && renderStep0_Upload()}
        {step === 1 && renderStep1_Scene()}
        {step === 2 && renderStep2_Vision()}
        {step === 3 && renderStep3_Result()}
      </main>

      {/* Action Button Area - Repositioned above Footer */}
      {step < 3 && !isGenerating && (
        <div className="p-8 pb-4 bg-white z-10 flex justify-center">
          <button
            onClick={step === 2 ? handleGenerate : handleNext}
            disabled={(step === 0 && !mainImage) || (step === 1 && !selectedScene)}
            className={`w-full max-w-xl py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transform transition-all active:scale-[0.98] flex items-center justify-center gap-3
              ${(step === 0 && !mainImage) || (step === 1 && !selectedScene)
                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-black hover:shadow-indigo-500/20 shadow-xl"
              }`}
          >
            {step === 2 ? (
              <>
                <Icons.Magic />
                Initialize AI Engine
              </>
            ) : (
              <>
                Continue Session
                <Icons.ChevronRight />
              </>
            )}
          </button>
        </div>
      )}

      {/* Persistent Application Footer */}
      <footer className="py-8 text-center bg-white border-t border-slate-50">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          &copy; 2025 Sakshay International AI Studio
        </p>
      </footer>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);