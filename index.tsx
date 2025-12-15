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
  Upload: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
const MODEL_TEXT = "gemini-3-pro-preview"; // Gemini 3 Pro
const MODEL_TEXT_FALLBACK = "gemini-2.5-flash"; // Fallback text model
const MODEL_IMAGE = "gemini-3-pro-image-preview"; // Nano Banana Pro
const MODEL_IMAGE_FALLBACK = "gemini-2.5-flash-image"; // Nano Banana (Fallback)
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
}: {
  label: string;
  subLabel?: string;
  image: string | null;
  onUpload: (base64: string) => void;
  onRemove: () => void;
  required?: boolean;
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

  return (
    <div className="mb-6 group">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">{label}</h3>
        {required ? (
          <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-rose-100">Required</span>
        ) : (
          <span className="text-xs font-medium text-slate-400">Optional</span>
        )}
      </div>
      
      <div
        className={`relative w-full aspect-[4/3] rounded-3xl transition-all duration-300 overflow-hidden shadow-sm
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
            
            {/* Overlay actions */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="px-4 py-2 bg-white text-slate-900 rounded-full text-xs font-bold shadow-lg hover:scale-105"
               >
                 Replace
               </button>
               {!required && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); onRemove(); }}
                   className="p-2 bg-rose-500 text-white rounded-full shadow-lg hover:scale-105"
                 >
                   <Icons.Delete />
                 </button>
               )}
            </div>
          </div>
        ) : (
          <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <div className="p-3 bg-white rounded-2xl shadow-sm mb-3 group-hover:scale-110 group-hover:shadow-md transition-all">
              <Icons.Upload />
            </div>
            <p className="text-sm font-semibold text-slate-600 group-hover:text-indigo-600">Tap to upload</p>
            {subLabel && <p className="text-xs mt-1 text-slate-400 font-medium">{subLabel}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---
function App() {
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [step, setStep] = useState<number>(0); // 0: Upload, 1: Scene, 2: Vision, 3: Processing/Result
  
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
      // Fallback for environments where aistudio might not be injected immediately
      setApiKeyReady(true);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success after closing dialog, or poll check
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
      // Instantiate AI with current key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `You are a creative director. Rewrite and enhance the following user request into a detailed, artistic image generation prompt (under 800 chars). Maintain the core intent but add professional lighting, texture, and composition details suitable for a high-end AI generator.
      
      User Request: "${visionText}"
      Selected Style: "${SCENES.find(s => s.id === selectedScene)?.name}"`;

      // Try Gemini 3 Pro first
      try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt
        });
        if (response.text) setVisionText(response.text.trim());
      } catch (e) {
        console.warn("Gemini 3 Pro (Text) failed, falling back to 2.5 Flash", e);
        // Fallback to Gemini 2.5 Flash
        const response = await ai.models.generateContent({
            model: MODEL_TEXT_FALLBACK,
            contents: prompt
        });
        if (response.text) setVisionText(response.text.trim());
      }
      
    } catch (e: any) {
      console.error("Enhancement failed completely", e);
      // If even fallback fails (e.g. no key at all), user will just have to use manual text
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
      // Instantiate AI with current key right before call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const scene = SCENES.find(s => s.id === selectedScene);
      
      // Construct parts 
      const parts: any[] = [];
      
      // 1. Main Image
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: mainImage.split(",")[1]
        }
      });

      // 2. Refs if available
      if (sceneRefImage) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: sceneRefImage.split(",")[1]
          }
        });
      }
      if (modelRefImage) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: modelRefImage.split(",")[1]
          }
        });
      }

      // 3. Prompt Construction
      let promptText = `Transform the first image provided.
      Style: ${scene?.name} (${scene?.description}).
      Vision: ${visionText}
      
      Requirements:
      - Photorealistic 4k quality.
      - Perfect lighting and shadows matching the style.
      - Keep the main subject from the first image identical in features.
      `;

      parts.push({ text: promptText });

      let response;
      let usedModel = "";

      // ATTEMPT 1: Gemini 3 Pro Image (Nano Banana Pro)
      try {
         usedModel = "Gemini 3 Pro Image";
         response = await ai.models.generateContent({ 
            model: MODEL_IMAGE, 
            contents: { role: "user", parts },
         });
      } catch (e: any) {
         console.warn("Primary model failed, attempting fallback to Nano Banana (2.5)...", e);
         
         // ATTEMPT 2: Gemini 2.5 Flash Image (Nano Banana)
         // This model is generally more available and faster
         usedModel = "Gemini 2.5 Flash Image";
         response = await ai.models.generateContent({ 
            model: MODEL_IMAGE_FALLBACK, 
            contents: { role: "user", parts },
         });
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
        console.error("No image generated", response?.text);
        setError("The AI could not generate an image. The content might be filtered.");
        setStep(2); 
      }

    } catch (e: any) {
      console.error(e);
      // Handle permission denied by resetting key state ONLY if both models failed due to permissions
      if (e.status === 403 || e.message?.includes("PERMISSION_DENIED")) {
        setError("Permission denied. Please ensure you have a valid API Key.");
        setApiKeyReady(false);
      } else {
        setError("An error occurred during generation. Please try again.");
      }
      setStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Views ---

  // Key Selection Screen
  if (!apiKeyReady) {
    return (
      <div className="ios-container items-center justify-center p-8 text-center bg-white">
        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-200">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Sakshay AI Studio</h1>
        <p className="text-slate-500 mb-10 leading-relaxed">
          Connect your account to access high-quality image generation models.
        </p>
        
        <button 
          onClick={handleSelectKey}
          className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
        >
          <Icons.Key />
          Connect Google Project
        </button>
        <p className="mt-6 text-xs text-slate-400">
          Requires a paid Google Cloud Project for Pro models. <br/>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline hover:text-indigo-600">Learn more about billing</a>
        </p>
      </div>
    );
  }

  const Header = () => (
    <div className="px-6 py-5 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
      {step > 0 ? (
        <button onClick={handleBack} className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors">
          <Icons.ChevronLeft />
        </button>
      ) : <div className="w-8"></div>}
      
      <div className="flex-1 text-center">
        <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          Sakshay AI Studio
        </h1>
      </div>
      
      <div className="w-8"></div>
    </div>
  );

  const renderStep0_Upload = () => (
    <div className="px-6 pt-6 pb-24 animate-fadeIn">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Upload Assets</h2>
        <p className="text-slate-500 font-medium">Add your reference photos to get started.</p>
      </div>

      <ImageUpload
        label="Main Product"
        subLabel="The star of the show"
        image={mainImage}
        onUpload={setMainImage}
        onRemove={() => setMainImage(null)}
        required
      />

      <div className="h-px bg-slate-100 my-8"></div>

      <div className="grid grid-cols-2 gap-4">
        <ImageUpload
          label="Scene Ref"
          subLabel="Environment"
          image={sceneRefImage}
          onUpload={setSceneRefImage}
          onRemove={() => setSceneRefImage(null)}
        />

        <ImageUpload
          label="Model Ref"
          subLabel="Pose/Style"
          image={modelRefImage}
          onUpload={setModelRefImage}
          onRemove={() => setModelRefImage(null)}
        />
      </div>
    </div>
  );

  const renderStep1_Scene = () => (
    <div className="px-6 pt-6 pb-24 animate-fadeIn">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Select Style</h2>
        <p className="text-slate-500 font-medium">Choose a professional aesthetic.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {SCENES.map((scene) => (
          <button
            key={scene.id}
            onClick={() => setSelectedScene(scene.id)}
            className={`p-5 rounded-3xl text-left transition-all duration-300 relative overflow-hidden group
              ${selectedScene === scene.id 
                ? "ring-2 ring-indigo-600 ring-offset-2 bg-white shadow-xl scale-[1.02]" 
                : "bg-white hover:bg-slate-50 border border-transparent shadow-sm hover:shadow-md"
              }`}
          >
            <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center text-2xl bg-gradient-to-br ${scene.gradient} shadow-inner`}>
              {scene.icon}
            </div>
            
            <h3 className={`font-bold mb-1 ${selectedScene === scene.id ? "text-indigo-900" : "text-slate-900"}`}>{scene.name}</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">{scene.description}</p>
            
            {selectedScene === scene.id && (
              <div className="absolute top-4 right-4 bg-indigo-600 rounded-full p-1 animate-scaleIn shadow-lg">
                <Icons.Check />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2_Vision = () => (
    <div className="px-6 pt-6 pb-24 animate-fadeIn">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Creative Vision</h2>
        <p className="text-slate-500 font-medium">Describe your dream result.</p>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-lg border border-slate-100 mb-6 relative overflow-hidden">
        {/* Summary Header */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
           {mainImage && (
             <div className="relative">
               <img src={mainImage} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100" />
               <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-white">
                 SRC
               </div>
             </div>
           )}
           <div>
             <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Applying Style</span>
             <p className="text-base font-bold text-slate-900">{SCENES.find(s => s.id === selectedScene)?.name}</p>
           </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={visionText}
            onChange={(e) => setVisionText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Describe the lighting, mood, colors, or specific elements you want to see..."
            disabled={isEnhancingPrompt}
            className="w-full h-48 p-4 bg-slate-50 rounded-2xl border-0 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all resize-none leading-relaxed text-sm"
          />
          
          {/* AI Enhance Button */}
          <button 
            onClick={handleEnhancePrompt}
            disabled={!visionText.trim() || isEnhancingPrompt}
            className={`absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm
              ${!visionText.trim() ? "opacity-50 cursor-not-allowed bg-slate-200 text-slate-400" : "bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:shadow-md hover:scale-105"}`}
          >
            {isEnhancingPrompt ? (
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
               <Icons.Sparkles />
            )}
            {isEnhancingPrompt ? "Enhancing..." : "Magic Enhance"}
          </button>
        </div>

        <div className="text-right mt-2 flex justify-between items-center px-1">
          <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">
             Auto-detect Model
          </span>
          <span className={`text-xs font-medium ${visionText.length >= MAX_CHARS ? "text-rose-500" : "text-slate-300"}`}>
            {visionText.length}/{MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  );

  const renderStep3_Result = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center h-[70vh] px-8 text-center animate-fadeIn">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl animate-pulse">✨</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Creating Masterpiece</h2>
          <p className="text-slate-500 font-medium max-w-[260px] mx-auto">
            Enhancing photo with {SCENES.find(s => s.id === selectedScene)?.name} style...
          </p>
        </div>
      );
    }

    if (error) {
       return (
        <div className="flex flex-col items-center justify-center h-[70vh] px-8 text-center animate-fadeIn">
           <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
             <span className="text-3xl">⚠️</span>
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2">Generation Failed</h3>
           <p className="text-slate-500 mb-8 leading-relaxed text-sm">{error}</p>
           <button 
             onClick={() => {
                if(error.includes("Permission denied")) {
                   handleSelectKey();
                } else {
                   setStep(2);
                }
             }}
             className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
           >
             {error.includes("Permission denied") ? "Connect Account" : "Try Again"}
           </button>
        </div>
       )
    }

    return (
      <div className="px-6 pt-6 pb-8 animate-fadeIn flex flex-col h-full">
         <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Your Masterpiece</h2>
         </div>

         <div className="flex-1 flex flex-col items-center justify-start min-h-[400px]">
           <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white">
             {generatedImage && <img src={generatedImage} className="w-full h-auto" alt="Generated" />}
             <div className="absolute top-4 left-4">
               <span className="bg-white/30 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/40 shadow-lg">
                 {usedModelName}
               </span>
             </div>
           </div>
         </div>

         <div className="mt-8 grid grid-cols-2 gap-4">
            <button 
              onClick={() => {
                setStep(0);
                setGeneratedImage(null);
                setMainImage(null);
                setSceneRefImage(null);
                setModelRefImage(null);
                setVisionText("");
                setSelectedScene(null);
                setUsedModelName("");
              }}
              className="w-full py-4 rounded-2xl font-bold bg-white text-slate-900 shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Restart
            </button>
            <a 
              href={generatedImage || "#"}
              download="sakshay-enhanced.jpg"
              className="w-full py-4 rounded-2xl font-bold bg-indigo-600 text-white flex items-center justify-center gap-2 shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-colors"
            >
              Save Image
            </a>
         </div>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="ios-container">
      <Header />
      
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        {step === 0 && renderStep0_Upload()}
        {step === 1 && renderStep1_Scene()}
        {step === 2 && renderStep2_Vision()}
        {step === 3 && renderStep3_Result()}
      </main>

      {/* Modern Floating Action Button */}
      {step < 3 && !isGenerating && (
        <div className="absolute bottom-0 left-0 right-0 p-6 pt-24 bg-gradient-to-t from-white via-white/90 to-transparent z-10 pointer-events-none">
          <button
            onClick={step === 2 ? handleGenerate : handleNext}
            disabled={(step === 0 && !mainImage) || (step === 1 && !selectedScene)}
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-2xl transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 pointer-events-auto
              ${(step === 0 && !mainImage) || (step === 1 && !selectedScene)
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-slate-900 text-white hover:bg-black"
              }`}
          >
            {step === 2 ? (
              <>
                <Icons.Magic />
                Generate
              </>
            ) : (
              <>
                Continue
                <Icons.ChevronRight />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);