import { useState, useRef, useEffect } from "react";
import { 
  LayoutGrid, 
  Type, 
  Square, 
  Frame,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Download,
  FileText,
  FileCode,
  Sparkles,
  Image as ImageIcon,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";
import { CollageElement } from "./CreationsAtelier";
import { toast } from "sonner";
import { PREDEFINED_BORDERS } from "@/lib/photoBookBorders";
import { PREDEFINED_TEMPLATES } from "@/lib/photoBookTemplates";
import { jsPDF } from "jspdf";

interface MiseEnPageTabProps {
  collageElements: CollageElement[];
  onUpdateElements: (elements: CollageElement[]) => void;
  selectedPhotos?: { id: number; photoUrl: string; title?: string }[];
  onCollageGenerated?: (imageData: string) => void;
}

// Dispositions prédéfinies (layouts simples)
const layouts = [
  { id: "grid-2x2", name: { fr: "Grille 2x2", en: "Grid 2x2" }, cols: 2, rows: 2 },
  { id: "grid-3x3", name: { fr: "Grille 3x3", en: "Grid 3x3" }, cols: 3, rows: 3 },
  { id: "mosaic-1", name: { fr: "Mosaïque 1", en: "Mosaic 1" }, pattern: "large-left" },
  { id: "mosaic-2", name: { fr: "Mosaïque 2", en: "Mosaic 2" }, pattern: "large-right" },
  { id: "horizontal", name: { fr: "Horizontal", en: "Horizontal" }, cols: 4, rows: 1 },
  { id: "vertical", name: { fr: "Vertical", en: "Vertical" }, cols: 1, rows: 4 },
];

// Styles de cadres simples
const frameStyles = [
  { id: "none", name: { fr: "Sans cadre", en: "No frame" }, border: "none" },
  { id: "simple", name: { fr: "Simple", en: "Simple" }, border: "2px solid #333" },
  { id: "double", name: { fr: "Double", en: "Double" }, border: "4px double #333" },
  { id: "rounded", name: { fr: "Arrondi", en: "Rounded" }, border: "2px solid #333", radius: 16 },
  { id: "shadow", name: { fr: "Ombre", en: "Shadow" }, shadow: true },
  { id: "polaroid", name: { fr: "Polaroid", en: "Polaroid" }, padding: "10px 10px 40px 10px", bg: "white" },
];

// Catégories de bordures
const borderCategories = [
  { id: "classic", name: { fr: "Classiques", en: "Classic" } },
  { id: "modern", name: { fr: "Modernes", en: "Modern" } },
  { id: "floral", name: { fr: "Florales", en: "Floral" } },
  { id: "vintage", name: { fr: "Vintage", en: "Vintage" } },
  { id: "elegant", name: { fr: "Élégantes", en: "Elegant" } },
];

// Catégories de templates
const templateCategories = [
  { id: "simple", name: { fr: "Simples", en: "Simple" } },
  { id: "collage", name: { fr: "Collages", en: "Collage" } },
  { id: "artistic", name: { fr: "Artistiques", en: "Artistic" } },
  { id: "combined", name: { fr: "Combinés", en: "Combined" } },
  { id: "custom", name: { fr: "Personnalisés", en: "Custom" } },
];

export default function MiseEnPageTab({
  collageElements,
  onUpdateElements,
  selectedPhotos = [],
  onCollageGenerated,
}: MiseEnPageTabProps) {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // États
  const [activeSubTab, setActiveSubTab] = useState("layouts");
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState("none");
  const [selectedBorder, setSelectedBorder] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeBorderCategory, setActiveBorderCategory] = useState("classic");
  const [activeTemplateCategory, setActiveTemplateCategory] = useState("simple");
  
  // États pour le texte
  const [textToAdd, setTextToAdd] = useState("");
  const [textColor, setTextColor] = useState("#000000");
  const [fontSize, setFontSize] = useState(24);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");
  
  // État pour la prévisualisation
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pageBackgroundColor, setPageBackgroundColor] = useState("#FFFFFF");
  
  // Pages multi-photos
  const [pages, setPages] = useState<{ id: string; photos: typeof selectedPhotos; templateId: string }[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  // État pour la colorisation des éléments
  const [tintColor, setTintColor] = useState<string | null>(null);
  const [tintColors] = useState([
    { id: 'none', color: null, name: { fr: 'Original', en: 'Original' } },
    { id: 'gold', color: '#D4AF37', name: { fr: 'Or', en: 'Gold' } },
    { id: 'silver', color: '#C0C0C0', name: { fr: 'Argent', en: 'Silver' } },
    { id: 'bronze', color: '#CD7F32', name: { fr: 'Bronze', en: 'Bronze' } },
    { id: 'sepia', color: '#704214', name: { fr: language === 'fr' ? language === 'fr' ? 'Sépia' : 'Sepia' : 'Sepia', en: 'Sepia' } },
    { id: 'blue', color: '#4169E1', name: { fr: 'Bleu', en: 'Blue' } },
    { id: 'red', color: '#DC143C', name: { fr: 'Rouge', en: 'Red' } },
    { id: 'green', color: '#228B22', name: { fr: 'Vert', en: 'Green' } },
    { id: 'purple', color: '#8B008B', name: { fr: 'Violet', en: 'Purple' } },
    { id: 'pink', color: '#FF69B4', name: { fr: 'Rose', en: 'Pink' } },
  ]);

  // Filtrer les bordures par catégorie
  const filteredBorders = PREDEFINED_BORDERS.filter(b => b.category === activeBorderCategory);
  
  // Filtrer les templates par catégorie
  const filteredTemplates = PREDEFINED_TEMPLATES.filter(t => t.category === activeTemplateCategory);

  // Appliquer une disposition
  const applyLayout = (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId);
    if (!layout || collageElements.length === 0) return;

    const canvasWidth = 800;
    const canvasHeight = 600;
    const padding = 20;
    const gap = 10;

    let newElements = [...collageElements];

    if (layout.cols && layout.rows) {
      const cellWidth = (canvasWidth - padding * 2 - gap * (layout.cols - 1)) / layout.cols;
      const cellHeight = (canvasHeight - padding * 2 - gap * (layout.rows - 1)) / layout.rows;

      newElements = newElements.map((el, index) => {
        const col = index % layout.cols!;
        const row = Math.floor(index / layout.cols!);
        
        if (row >= layout.rows!) return el;

        return {
          ...el,
          x: padding + col * (cellWidth + gap),
          y: padding + row * (cellHeight + gap),
          width: cellWidth,
          height: cellHeight,
          rotation: 0,
        };
      });
    }

    onUpdateElements(newElements);
    setSelectedLayout(layoutId);
    toast.success(language === "fr" ? "Disposition appliquée !" : "Layout applied!");
  };

  // Appliquer un style de cadre à tous les éléments
  const applyFrameStyle = (frameId: string) => {
    const frame = frameStyles.find(f => f.id === frameId);
    if (!frame) return;

    const newElements = collageElements.map(el => ({
      ...el,
      borderWidth: frame.border ? parseInt(frame.border) : 0,
      borderColor: frame.border ? "#333333" : undefined,
      borderRadius: frame.radius || 0,
      shadow: frame.shadow || false,
    }));

    onUpdateElements(newElements);
    setSelectedFrame(frameId);
    toast.success(language === "fr" ? "Style de cadre appliqué !" : "Frame style applied!");
  };

  // Appliquer une bordure décorative
  const applyDecorativeBorder = (borderId: string) => {
    const border = PREDEFINED_BORDERS.find(b => b.id === borderId);
    if (!border) return;

    setSelectedBorder(borderId);
    
    // Appliquer la bordure à tous les éléments images
    const newElements = collageElements.map(el => {
      if (el.type === "image") {
        return {
          ...el,
          decorativeBorderUrl: border.imageUrl,
          decorativeBorderId: borderId,
        };
      }
      return el;
    });

    onUpdateElements(newElements);
    toast.success(language === "fr" ? `Bordure "${border.name}" appliquée !` : `Border "${border.name}" applied!`);
  };

  // Appliquer un template
  const applyTemplate = (templateId: string) => {
    const template = PREDEFINED_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    
    // Créer les éléments à partir du template
    const newElements: CollageElement[] = template.frames.map((frame, index) => {
      const photo = selectedPhotos[index];
      return {
        id: `template_${templateId}_${index}_${Date.now()}`,
        type: "image" as const,
        src: photo?.photoUrl || "",
        x: (frame.position.x / 100) * 800,
        y: (frame.position.y / 100) * 600,
        width: (frame.position.width / 100) * 800,
        height: (frame.position.height / 100) * 600,
        rotation: frame.position.rotation || 0,
        zIndex: frame.position.zIndex || index + 1,
        opacity: 1,
      };
    });

    onUpdateElements(newElements);
    
    if (template.backgroundColor) {
      setPageBackgroundColor(template.backgroundColor);
    }
    
    toast.success(language === "fr" ? `Template "${template.name}" appliqué !` : `Template "${template.name}" applied!`);
  };

  // Ajouter du texte
  const handleAddText = () => {
    if (!textToAdd.trim()) return;

    const newElement: CollageElement = {
      id: `text_${Date.now()}`,
      type: "text",
      text: textToAdd,
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      rotation: 0,
      zIndex: collageElements.length + 1,
      opacity: 1,
      textColor: textColor,
      fontSize: fontSize,
      textAlign: textAlign,
    };

    onUpdateElements([...collageElements, newElement]);
    setTextToAdd("");
    toast.success(language === "fr" ? "Texte ajouté !" : "Text added!");
  };

  // Générer l'image du collage
  const generateCollageImage = async (): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = 800;
    canvas.height = 600;

    // Fond
    ctx.fillStyle = pageBackgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessiner les éléments
    for (const el of collageElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))) {
      if (el.type === "image" && el.src) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            ctx.save();
            ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
            ctx.rotate((el.rotation || 0) * Math.PI / 180);
            ctx.globalAlpha = el.opacity || 1;
            ctx.drawImage(img, -el.width / 2, -el.height / 2, el.width, el.height);
            
            // Dessiner la bordure décorative si présente
            if (el.decorativeBorderUrl) {
              const borderImg = new Image();
              borderImg.crossOrigin = "anonymous";
              borderImg.onload = () => {
                ctx.drawImage(borderImg, -el.width / 2, -el.height / 2, el.width, el.height);
                ctx.restore();
                resolve();
              };
              borderImg.onerror = () => {
                ctx.restore();
                resolve();
              };
              borderImg.src = el.decorativeBorderUrl;
            } else {
              ctx.restore();
              resolve();
            }
          };
          img.onerror = () => resolve();
          img.src = el.src || "";
        });
      } else if (el.type === "text" && el.text) {
        ctx.save();
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        ctx.rotate((el.rotation || 0) * Math.PI / 180);
        ctx.globalAlpha = el.opacity || 1;
        ctx.font = `${el.fontSize || 24}px Arial`;
        ctx.fillStyle = el.textColor || "#000000";
        ctx.textAlign = el.textAlign || "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.text, 0, 0);
        ctx.restore();
      }
    }

    return canvas.toDataURL("image/png");
  };

  // Exporter en PDF
  const exportToPDF = async () => {
    const imageData = await generateCollageImage();
    if (!imageData) {
      toast.error(language === "fr" ? "Erreur lors de la génération" : "Generation error");
      return;
    }

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Ajouter l'image au PDF
    pdf.addImage(imageData, "PNG", 10, 10, 277, 190);

    // Télécharger
    pdf.save(`creation_${Date.now()}.pdf`);
    toast.success(language === "fr" ? "PDF exporté !" : "PDF exported!");
  };

  // Exporter en SVG (format vectoriel pour meilleure qualité d'impression)
  const exportToSVG = () => {
    if (collageElements.length === 0) {
      toast.error(language === "fr" ? "Aucun élément à exporter" : "No elements to export");
      return;
    }

    // Créer le SVG - utiliser la taille standard A4 paysage (297x210mm à 96dpi)
    const svgWidth = 1123; // ~297mm
    const svgHeight = 794; // ~210mm
    
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svgContent += `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" `;
    svgContent += `width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">\n`;
    
    // Fond
    svgContent += `  <rect width="100%" height="100%" fill="${pageBackgroundColor}" />\n`;
    
    // Trier les éléments par zIndex
    const sortedElements = [...collageElements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    // Ajouter chaque élément
    for (const el of sortedElements) {
      const centerX = el.x + el.width / 2;
      const centerY = el.y + el.height / 2;
      const rotation = el.rotation || 0;
      const opacity = el.opacity || 1;
      const flipX = el.flipX ? -1 : 1;
      const flipY = el.flipY ? -1 : 1;
      
      svgContent += `  <g transform="translate(${centerX}, ${centerY}) rotate(${rotation}) scale(${flipX}, ${flipY})" opacity="${opacity}">\n`;
      
      if (el.type === "image" && el.src) {
        // Pour les images, on utilise une référence xlink:href
        svgContent += `    <image x="${-el.width / 2}" y="${-el.height / 2}" `;
        svgContent += `width="${el.width}" height="${el.height}" `;
        svgContent += `xlink:href="${el.src}" preserveAspectRatio="xMidYMid meet" />\n`;
        
        // Bordure décorative si présente
        if (el.decorativeBorderUrl) {
          svgContent += `    <image x="${-el.width / 2}" y="${-el.height / 2}" `;
          svgContent += `width="${el.width}" height="${el.height}" `;
          svgContent += `xlink:href="${el.decorativeBorderUrl}" preserveAspectRatio="xMidYMid meet" />\n`;
        }
      } else if (el.type === "text" && el.text) {
        const fontSize = el.fontSize || 24;
        const textColor = el.textColor || "#000000";
        const textAnchor = el.textAlign === "left" ? "start" : el.textAlign === "right" ? "end" : "middle";
        
        svgContent += `    <text x="0" y="0" `;
        svgContent += `font-size="${fontSize}" fill="${textColor}" `;
        svgContent += `text-anchor="${textAnchor}" dominant-baseline="middle" `;
        svgContent += `font-family="Arial, sans-serif">${escapeXml(el.text)}</text>\n`;
      }
      
      svgContent += `  </g>\n`;
    }
    
    svgContent += `</svg>`;
    
    // Télécharger le fichier SVG
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `creation_${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success(language === "fr" ? "SVG exporté ! Format vectoriel pour impression haute qualité." : "SVG exported! Vector format for high-quality printing.");
  };

  // Fonction pour échapper les caractères spéciaux XML
  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  // Prévisualiser
  const handlePreview = async () => {
    const imageData = await generateCollageImage();
    if (imageData) {
      setPreviewImage(imageData);
      if (onCollageGenerated) {
        onCollageGenerated(imageData);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Canvas caché pour la génération */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Sous-onglets */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="flex-1 flex flex-col">
        <TabsList className="mx-6 mt-4 grid grid-cols-10 gap-1">
          <TabsTrigger value="layouts" className="text-xs">
            <LayoutGrid className="w-3 h-3 mr-1" />
            {language === "fr" ? "Dispositions" : "Layouts"}
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">
            <ImageIcon className="w-3 h-3 mr-1" />
            {language === "fr" ? "Templates" : "Templates"}
          </TabsTrigger>
          <TabsTrigger value="borders" className="text-xs">
            <Frame className="w-3 h-3 mr-1" />
            {language === "fr" ? "Bordures" : "Borders"}
          </TabsTrigger>
          <TabsTrigger value="text" className="text-xs">
            <Type className="w-3 h-3 mr-1" />
            {language === "fr" ? "Texte" : "Text"}
          </TabsTrigger>
          <TabsTrigger value="frises" className="text-xs">
            <Square className="w-3 h-3 mr-1" />
            {language === "fr" ? "Frises" : "Friezes"}
          </TabsTrigger>
          <TabsTrigger value="coins" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            {language === "fr" ? "Coins" : "Corners"}
          </TabsTrigger>
          <TabsTrigger value="lettres" className="text-xs">
            <Type className="w-3 h-3 mr-1" />
            {language === "fr" ? "Lettres" : "Letters"}
          </TabsTrigger>
          <TabsTrigger value="masques" className="text-xs">
            <Frame className="w-3 h-3 mr-1" />
            {language === "fr" ? "Masques" : "Masks"}
          </TabsTrigger>
          <TabsTrigger value="formes" className="text-xs">
            <Square className="w-3 h-3 mr-1" />
            {language === "fr" ? "Formes" : "Shapes"}
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs">
            <Download className="w-3 h-3 mr-1" />
            {language === "fr" ? "Export" : "Export"}
          </TabsTrigger>
        </TabsList>

        {/* Contenu des sous-onglets */}
        <div className="flex-1 overflow-hidden p-6">
          {/* DISPOSITIONS */}
          <TabsContent value="layouts" className="h-full m-0">
            <div className="grid grid-cols-2 gap-6 h-full">
              {/* Grille de dispositions */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  {language === "fr" ? "Dispositions automatiques" : "Auto Layouts"}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {layouts.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => applyLayout(layout.id)}
                      disabled={collageElements.length === 0}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedLayout === layout.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      } ${collageElements.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="w-full aspect-video bg-gray-100 rounded mb-2 p-1 flex flex-wrap gap-0.5">
                        {layout.cols && layout.rows && (
                          Array.from({ length: Math.min(layout.cols * layout.rows, 9) }).map((_, i) => (
                            <div
                              key={i}
                              className="bg-purple-200 rounded-sm"
                              style={{
                                width: `calc(${100 / layout.cols}% - 2px)`,
                                height: `calc(${100 / layout.rows}% - 2px)`,
                              }}
                            />
                          ))
                        )}
                      </div>
                      <span className="text-xs text-gray-600">
                        {layout.name[language as "fr" | "en"]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Styles de cadres */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <Frame className="w-4 h-4" />
                  {language === "fr" ? "Styles de cadres" : "Frame Styles"}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {frameStyles.map((frame) => (
                    <button
                      key={frame.id}
                      onClick={() => applyFrameStyle(frame.id)}
                      disabled={collageElements.length === 0}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedFrame === frame.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      } ${collageElements.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div 
                        className="w-12 h-12 mx-auto mb-2 bg-gray-200"
                        style={{
                          border: frame.border || "none",
                          borderRadius: frame.radius || 0,
                          boxShadow: frame.shadow ? "0 4px 6px rgba(0,0,0,0.3)" : "none",
                          padding: frame.padding || 0,
                          backgroundColor: frame.bg || "#e5e7eb",
                        }}
                      />
                      <span className="text-xs text-gray-600">
                        {frame.name[language as "fr" | "en"]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TEMPLATES */}
          <TabsContent value="templates" className="h-full m-0">
            <div className="h-full flex flex-col">
              {/* Catégories */}
              <div className="flex gap-2 mb-4">
                {templateCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={activeTemplateCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTemplateCategory(cat.id)}
                  >
                    {cat.name[language as "fr" | "en"]}
                  </Button>
                ))}
              </div>

              {/* Grille de templates */}
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-4 gap-3">
                  {filteredTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedTemplate === template.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      {/* Aperçu visuel du template */}
                      <div 
                        className="w-full aspect-[4/3] bg-gray-100 rounded mb-2 relative overflow-hidden"
                        style={{ backgroundColor: template.backgroundColor || "#f3f4f6" }}
                      >
                        {template.frames.map((frame, i) => (
                          <div
                            key={i}
                            className="absolute bg-purple-200 border border-purple-300"
                            style={{
                              left: `${frame.position.x}%`,
                              top: `${frame.position.y}%`,
                              width: `${frame.position.width}%`,
                              height: `${frame.position.height}%`,
                              transform: frame.position.rotation ? `rotate(${frame.position.rotation}deg)` : undefined,
                              borderRadius: frame.shape === "circle" ? "50%" : "4px",
                            }}
                          />
                        ))}
                      </div>
                      <div className="text-xs font-medium text-gray-700 truncate">{template.name}</div>
                      <div className="text-[10px] text-gray-500 truncate">{template.description}</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* BORDURES DÉCORATIVES */}
          <TabsContent value="borders" className="h-full m-0">
            <div className="h-full flex flex-col">
              {/* Catégories */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {borderCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={activeBorderCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveBorderCategory(cat.id)}
                  >
                    {cat.name[language as "fr" | "en"]}
                  </Button>
                ))}
              </div>

              {/* Grille de bordures */}
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-5 gap-3">
                  {/* Option sans bordure */}
                  <button
                    onClick={() => {
                      setSelectedBorder(null);
                      const newElements = collageElements.map(el => ({
                        ...el,
                        decorativeBorderUrl: undefined,
                        decorativeBorderId: undefined,
                      }));
                      onUpdateElements(newElements);
                      toast.success(language === "fr" ? "Bordures retirées" : "Borders removed");
                    }}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedBorder === null
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="w-16 h-16 mx-auto mb-2 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-2xl">∅</span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {language === "fr" ? "Aucune" : "None"}
                    </span>
                  </button>

                  {filteredBorders.map((border) => (
                    <button
                      key={border.id}
                      onClick={() => applyDecorativeBorder(border.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedBorder === border.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div 
                        className="w-16 h-16 mx-auto mb-2 bg-gray-50 rounded overflow-hidden"
                        style={{
                          backgroundImage: `url(${border.imageUrl})`,
                          backgroundSize: "contain",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                        }}
                      />
                      <span className="text-xs text-gray-600 block truncate">{border.name}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* TEXTE */}
          <TabsContent value="text" className="h-full m-0">
            <div className="grid grid-cols-2 gap-6">
              {/* Ajout de texte simple */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  {language === "fr" ? "Ajouter du texte" : "Add Text"}
                </h3>

                <div className="space-y-3">
                  <Input
                    placeholder={language === "fr" ? "Votre texte..." : "Your text..."}
                    value={textToAdd}
                    onChange={(e) => setTextToAdd(e.target.value)}
                  />

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">
                        {language === "fr" ? "Couleur" : "Color"}
                      </label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">
                        {language === "fr" ? "Taille" : "Size"}
                      </label>
                      <Input
                        type="number"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value) || 24)}
                        min={12}
                        max={72}
                        className="h-8"
                      />
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button 
                      variant={textAlign === "left" ? "default" : "outline"} 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setTextAlign("left")}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant={textAlign === "center" ? "default" : "outline"} 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setTextAlign("center")}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant={textAlign === "right" ? "default" : "outline"} 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setTextAlign("right")}
                    >
                      <AlignRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button 
                    onClick={handleAddText} 
                    disabled={!textToAdd.trim()}
                    className="w-full"
                  >
                    {language === "fr" ? "Ajouter le texte" : "Add text"}
                  </Button>
                </div>
              </div>

              {/* Couleur de fond */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  {language === "fr" ? "Couleur de fond" : "Background Color"}
                </h3>

                <div className="space-y-3">
                  <input
                    type="color"
                    value={pageBackgroundColor}
                    onChange={(e) => setPageBackgroundColor(e.target.value)}
                    className="w-full h-12 rounded cursor-pointer"
                  />
                  
                  {/* Couleurs prédéfinies */}
                  <div className="flex gap-2 flex-wrap">
                    {["#FFFFFF", "#F5F5F5", "#FFFBEB", "#FEF3C7", "#ECFDF5", "#F0FDF4", "#EFF6FF", "#FDF2F8", "#1A1A1A"].map((color) => (
                      <button
                        key={color}
                        onClick={() => setPageBackgroundColor(color)}
                        className={`w-8 h-8 rounded border-2 transition-all ${
                          pageBackgroundColor === color ? "border-purple-500 scale-110" : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* FRISES */}
          <TabsContent value="frises" className="h-full m-0">
            <div className="grid grid-cols-2 gap-6 h-full">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <Square className="w-4 h-4" />
                  {language === "fr" ? "Frises décoratives" : "Decorative Friezes"}
                </h3>
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "frise-1", url: "/mise-en-page/frises/0b320dc1ee9a60f80918db3133b01bce.jpg" },
                      { id: "frise-2", url: "/mise-en-page/frises/8bf4c42c97f15f3f010d46b90774192a.jpg" },
                    ].map((frise) => (
                      <button
                        key={frise.id}
                        onClick={() => {
                          const newElement: CollageElement = {
                            id: `frise-${Date.now()}`,
                            type: "image",
                            src: frise.url,
                            x: 50,
                            y: 50,
                            width: 200,
                            height: 100,
                            rotation: 0,
                            zIndex: collageElements.length,
                            opacity: 1,
                            tintColor: tintColor || undefined,
                          };
                          onUpdateElements([...collageElements, newElement]);
                          toast.success(language === "fr" ? "Frise ajoutée" : "Frieze added");
                        }}
                        className="p-2 rounded-lg border-2 border-gray-200 hover:border-purple-500 transition-all overflow-hidden"
                      >
                        <img src={frise.url} alt={frise.id} className="w-full h-20 object-cover rounded" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4">
                  {language === "fr" ? "Aide" : "Help"}
                </h3>
                <p className="text-xs text-gray-600">
                  {language === "fr" 
                    ? (language === 'fr' ? "Cliquez sur une frise pour l'ajouter à votre composition. Vous pouvez ensuite la redimensionner et la positionner." : "Click on a border to add it to your composition. You can then resize and position it.")
                    : "Click on a frieze to add it to your composition. You can then resize and position it."}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* COINS */}
          <TabsContent value="coins" className="h-full m-0">
            <div className="grid grid-cols-2 gap-6 h-full">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {language === "fr" ? "Ornements de coins" : "Corner Ornaments"}
                </h3>
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "coin-1", url: "/mise-en-page/coins/e00cc3b8772022ef34b291ff637affa6.jpg" },
                      { id: "coin-2", url: "/mise-en-page/coins/5687f40b30a7501580329c5c7a774df0.jpg" },
                      { id: "coin-3", url: "/mise-en-page/coins/0efa3afddb482d098c30dbf62b11a6a6.jpg" },
                    ].map((coin) => (
                      <div key={coin.id} className="flex flex-col gap-1">
                        <button
                          onClick={() => {
                            const newElement: CollageElement = {
                              id: `coin-${Date.now()}`,
                              type: "image",
                              src: coin.url,
                              x: 50,
                              y: 50,
                              width: 100,
                              height: 100,
                              rotation: 0,
                              zIndex: collageElements.length,
                              opacity: 1,
                              tintColor: tintColor || undefined,
                            };
                            onUpdateElements([...collageElements, newElement]);
                            toast.success(language === "fr" ? "Ornement ajouté" : "Ornament added");
                          }}
                          className="p-2 rounded-lg border-2 border-gray-200 hover:border-purple-500 transition-all overflow-hidden"
                        >
                          <img src={coin.url} alt={coin.id} className="w-full h-20 object-contain rounded" />
                        </button>
                        <button
                          onClick={() => {
                            // Ajouter l'ornement aux 4 coins avec rotations appropriées
                            const baseSize = 100;
                            const margin = 20;
                            const canvasWidth = 800; // Largeur par défaut du canevas
                            const canvasHeight = 600; // Hauteur par défaut du canevas
                            
                            const corners = [
                              { x: margin, y: margin, rotation: 0 }, // Haut gauche
                              { x: canvasWidth - baseSize - margin, y: margin, rotation: 90 }, // Haut droite
                              { x: canvasWidth - baseSize - margin, y: canvasHeight - baseSize - margin, rotation: 180 }, // Bas droite
                              { x: margin, y: canvasHeight - baseSize - margin, rotation: 270 }, // Bas gauche
                            ];
                            
                            const newElements = corners.map((corner, index) => ({
                              id: `coin-${Date.now()}-${index}`,
                              type: "image" as const,
                              src: coin.url,
                              x: corner.x,
                              y: corner.y,
                              width: baseSize,
                              height: baseSize,
                              rotation: corner.rotation,
                              zIndex: collageElements.length + index,
                              opacity: 1,
                              tintColor: tintColor || undefined,
                            }));
                            
                            onUpdateElements([...collageElements, ...newElements]);
                            toast.success(language === "fr" ? "4 coins ajoutés" : "4 corners added");
                          }}
                          className="px-2 py-1 text-xs rounded bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                          title={language === "fr" ? "Appliquer aux 4 coins" : "Apply to 4 corners"}
                        >
                          {language === "fr" ? "4 coins" : "4 corners"}
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4">
                  {language === "fr" ? "Aide" : "Help"}
                </h3>
                <p className="text-xs text-gray-600">
                  {language === "fr" 
                    ? "Cliquez sur un ornement pour l'ajouter, ou utilisez le bouton '4 coins' pour décorer automatiquement les 4 angles de votre page."
                    : "Click on an ornament to add it, or use the '4 corners' button to automatically decorate all 4 corners of your page."}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* LETTRES */}
          <TabsContent value="lettres" className="h-full m-0">
            <div className="grid grid-cols-2 gap-6 h-full">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  {language === "fr" ? "Lettres décoratives" : "Decorative Letters"}
                </h3>
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
                      'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
                    ].map((letter) => (
                      <button
                        key={letter}
                        onClick={() => {
                          const newElement: CollageElement = {
                            id: `lettre-${letter}-${Date.now()}`,
                            type: "image",
                            src: `/mise-en-page/lettres/individuelles/lettre-${letter}.png`,
                            x: 50,
                            y: 50,
                            width: 80,
                            height: 80,
                            rotation: 0,
                            zIndex: collageElements.length,
                            opacity: 1,
                            tintColor: tintColor || undefined,
                          };
                          onUpdateElements([...collageElements, newElement]);
                          toast.success(language === "fr" ? `Lettre ${letter} ajoutée` : `Letter ${letter} added`);
                        }}
                        className="p-2 rounded-lg border-2 border-gray-200 hover:border-purple-500 transition-all overflow-hidden bg-white"
                        title={letter}
                      >
                        <img 
                          src={`/mise-en-page/lettres/individuelles/lettre-${letter}.png`} 
                          alt={letter} 
                          className="w-full h-12 object-contain"
                        />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  {language === "fr" ? "Colorisation" : "Colorization"}
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  {language === "fr" 
                    ? (language === 'fr' ? "Sélectionnez une couleur pour teinter les lettres et éléments décoratifs." : "Select a color to tint the letters and decorative elements.")
                    : "Select a color to tint letters and decorative elements."}
                </p>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {tintColors.map((tc) => (
                    <button
                      key={tc.id}
                      onClick={() => setTintColor(tc.color)}
                      className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                        tintColor === tc.color
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                      title={tc.name[language as "fr" | "en"]}
                    >
                      <div 
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: tc.color || '#FFFFFF' }}
                      />
                      <span className="text-[10px] text-gray-600">
                        {tc.name[language as "fr" | "en"]}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">
                    {language === "fr" ? "Couleur personnalisée :" : "Custom color:"}
                  </label>
                  <input
                    type="color"
                    value={tintColor || "#000000"}
                    onChange={(e) => setTintColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  {language === "fr" 
                    ? (language === 'fr' ? "Ces lettres baroques sont parfaites pour créer des initiales décoratives ou des monogrammes." : "These baroque letters are perfect for creating decorative initials or monograms.")
                    : "These baroque letters are perfect for creating decorative initials or monograms."}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* MASQUES */}
          <TabsContent value="masques" className="h-full m-0">
            <div className="grid grid-cols-2 gap-6 h-full">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <Frame className="w-4 h-4" />
                  {language === "fr" ? "Formes géométriques" : "Geometric Shapes"}
                </h3>
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'cercle', name: { fr: 'Cercle', en: 'Circle' } },
                      { id: 'pentagone', name: { fr: 'Pentagone', en: 'Pentagon' } },
                      { id: 'ovale', name: { fr: 'Ovale', en: 'Oval' } },
                      { id: 'etoile-6', name: { fr: language === 'fr' ? 'Étoile' : 'Star', en: 'Star' } },
                      { id: 'feuille', name: { fr: 'Feuille', en: 'Leaf' } },
                      { id: 'losange-4', name: { fr: 'Losange 4', en: 'Diamond 4' } },
                      { id: 'goutte', name: { fr: 'Goutte', en: 'Drop' } },
                      { id: 'parallelogramme', name: { fr: language === 'fr' ? 'Parallélogramme' : 'Parallelogram', en: 'Parallelogram' } },
                      { id: 'rectangle', name: { fr: 'Rectangle', en: 'Rectangle' } },
                      { id: 'triangle', name: { fr: 'Triangle', en: 'Triangle' } },
                      { id: 'hexagone', name: { fr: 'Hexagone', en: 'Hexagon' } },
                      { id: 'coeur', name: { fr: 'Cœur', en: 'Heart' } },
                      { id: 'trapeze', name: { fr: language === 'fr' ? 'Trapèze' : 'Trapezoid', en: 'Trapezoid' } },
                      { id: 'goutte-2', name: { fr: 'Goutte 2', en: 'Drop 2' } },
                      { id: 'losange', name: { fr: 'Losange', en: 'Diamond' } },
                    ].map((shape) => (
                      <button
                        key={shape.id}
                        onClick={() => {
                          const newElement: CollageElement = {
                            id: `masque-${shape.id}-${Date.now()}`,
                            type: "image",
                            src: `/mise-en-page/masques/individuelles/masque-${shape.id}.png`,
                            x: 50,
                            y: 50,
                            width: 100,
                            height: 100,
                            rotation: 0,
                            zIndex: collageElements.length,
                            opacity: 1,
                            tintColor: tintColor || undefined,
                          };
                          onUpdateElements([...collageElements, newElement]);
                          toast.success(language === "fr" ? `${shape.name.fr} ajouté` : `${shape.name.en} added`);
                        }}
                        className="p-2 rounded-lg border-2 border-gray-200 hover:border-purple-500 transition-all overflow-hidden bg-white"
                        title={language === "fr" ? shape.name.fr : shape.name.en}
                      >
                        <img 
                          src={`/mise-en-page/masques/individuelles/masque-${shape.id}.png`} 
                          alt={shape.name.fr} 
                          className="w-full h-12 object-contain"
                        />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4">
                  {language === "fr" ? "Aide" : "Help"}
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  {language === "fr" 
                    ? (language === 'fr' ? "Cliquez sur une forme pour l'ajouter à votre composition. Ces formes peuvent servir de masques de découpe ou d'éléments décoratifs." : "Click on a shape to add it to your composition. These shapes can serve as cutting masks or decorative elements.")
                    : "Click on a shape to add it to your composition. These shapes can be used as photo masks or decorative elements."}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* FORMES DÉCORATIVES */}
          <TabsContent value="formes" className="h-full m-0">
            <div className="grid grid-cols-2 gap-6 h-full">
              {/* Formes géométriques simples */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <Square className="w-4 h-4" />
                  {language === "fr" ? "Formes géométriques" : "Geometric Shapes"}
                </h3>
                <ScrollArea className="h-[350px]">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'rect', name: { fr: 'Rectangle', en: 'Rectangle' }, svg: '<rect x="10" y="20" width="80" height="60" fill="currentColor"/>' },
                      { id: 'square', name: { fr: language === 'fr' ? 'Carré' : 'Square', en: 'Square' }, svg: '<rect x="15" y="15" width="70" height="70" fill="currentColor"/>' },
                      { id: 'circle', name: { fr: 'Cercle', en: 'Circle' }, svg: '<circle cx="50" cy="50" r="40" fill="currentColor"/>' },
                      { id: 'ellipse', name: { fr: 'Ellipse', en: 'Ellipse' }, svg: '<ellipse cx="50" cy="50" rx="45" ry="30" fill="currentColor"/>' },
                      { id: 'triangle', name: { fr: 'Triangle', en: 'Triangle' }, svg: '<polygon points="50,10 90,90 10,90" fill="currentColor"/>' },
                      { id: 'triangle-down', name: { fr: 'Triangle bas', en: 'Triangle Down' }, svg: '<polygon points="50,90 90,10 10,10" fill="currentColor"/>' },
                      { id: 'diamond', name: { fr: 'Losange', en: 'Diamond' }, svg: '<polygon points="50,5 95,50 50,95 5,50" fill="currentColor"/>' },
                      { id: 'pentagon', name: { fr: 'Pentagone', en: 'Pentagon' }, svg: '<polygon points="50,5 95,38 77,90 23,90 5,38" fill="currentColor"/>' },
                      { id: 'hexagon', name: { fr: 'Hexagone', en: 'Hexagon' }, svg: '<polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="currentColor"/>' },
                      { id: 'octagon', name: { fr: 'Octogone', en: 'Octagon' }, svg: '<polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" fill="currentColor"/>' },
                      { id: 'star-5', name: { fr: language === 'fr' ? 'Étoile 5' : 'Star 5', en: '5-Star' }, svg: '<polygon points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40" fill="currentColor"/>' },
                      { id: 'star-6', name: { fr: language === 'fr' ? 'Étoile 6' : 'Star 6', en: '6-Star' }, svg: '<polygon points="50,5 60,35 95,35 70,55 80,90 50,70 20,90 30,55 5,35 40,35" fill="currentColor"/>' },
                      { id: 'heart', name: { fr: 'Cœur', en: 'Heart' }, svg: '<path d="M50,85 C20,55 5,35 15,20 C30,5 50,15 50,30 C50,15 70,5 85,20 C95,35 80,55 50,85" fill="currentColor"/>' },
                      { id: 'cross', name: { fr: 'Croix', en: 'Cross' }, svg: '<polygon points="35,5 65,5 65,35 95,35 95,65 65,65 65,95 35,95 35,65 5,65 5,35 35,35" fill="currentColor"/>' },
                      { id: 'arrow-right', name: { fr: language === 'fr' ? 'Flèche droite' : 'Right arrow', en: 'Arrow Right' }, svg: '<polygon points="5,35 60,35 60,15 95,50 60,85 60,65 5,65" fill="currentColor"/>' },
                      { id: 'arrow-up', name: { fr: language === 'fr' ? 'Flèche haut' : 'Up arrow', en: 'Arrow Up' }, svg: '<polygon points="50,5 85,40 65,40 65,95 35,95 35,40 15,40" fill="currentColor"/>' },
                    ].map((shape) => (
                      <button
                        key={shape.id}
                        onClick={() => {
                          // Créer un SVG data URL
                          const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">${shape.svg.replace('currentColor', tintColor || '#3b82f6')}</svg>`;
                          const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
                          
                          const newElement: CollageElement = {
                            id: `forme-${shape.id}-${Date.now()}`,
                            type: "image",
                            src: svgDataUrl,
                            x: 100 + Math.random() * 100,
                            y: 100 + Math.random() * 100,
                            width: 80,
                            height: 80,
                            rotation: 0,
                            zIndex: collageElements.length + 1,
                            opacity: 1,
                          };
                          onUpdateElements([...collageElements, newElement]);
                          toast.success(language === "fr" ? `${shape.name.fr} ajouté` : `${shape.name.en} added`);
                        }}
                        className="p-2 rounded-lg border-2 border-gray-200 hover:border-purple-500 transition-all bg-white flex items-center justify-center"
                        title={language === "fr" ? shape.name.fr : shape.name.en}
                      >
                        <svg viewBox="0 0 100 100" className="w-10 h-10" style={{ color: tintColor || '#3b82f6' }}>
                          <g dangerouslySetInnerHTML={{ __html: shape.svg }} />
                        </svg>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Lignes et séparateurs */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <Frame className="w-4 h-4" />
                  {language === "fr" ? "Lignes et séparateurs" : "Lines & Separators"}
                </h3>
                <ScrollArea className="h-[200px]">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'line-h', name: { fr: 'Ligne horizontale', en: 'Horizontal Line' }, svg: '<line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" stroke-width="4"/>' },
                      { id: 'line-v', name: { fr: 'Ligne verticale', en: 'Vertical Line' }, svg: '<line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" stroke-width="4"/>' },
                      { id: 'line-diag', name: { fr: 'Diagonale', en: 'Diagonal' }, svg: '<line x1="5" y1="95" x2="95" y2="5" stroke="currentColor" stroke-width="4"/>' },
                      { id: 'double-line', name: { fr: 'Double ligne', en: 'Double Line' }, svg: '<line x1="5" y1="40" x2="95" y2="40" stroke="currentColor" stroke-width="3"/><line x1="5" y1="60" x2="95" y2="60" stroke="currentColor" stroke-width="3"/>' },
                      { id: 'dashed', name: { fr: language === 'fr' ? 'Pointillés' : 'Dotted', en: 'Dashed' }, svg: '<line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" stroke-width="4" stroke-dasharray="10,5"/>' },
                      { id: 'dotted', name: { fr: 'Points', en: 'Dotted' }, svg: '<line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" stroke-width="4" stroke-dasharray="2,8" stroke-linecap="round"/>' },
                      { id: 'wave', name: { fr: 'Vague', en: 'Wave' }, svg: '<path d="M5,50 Q20,30 35,50 T65,50 T95,50" stroke="currentColor" stroke-width="4" fill="none"/>' },
                      { id: 'zigzag', name: { fr: 'Zigzag', en: 'Zigzag' }, svg: '<polyline points="5,50 20,30 35,70 50,30 65,70 80,30 95,50" stroke="currentColor" stroke-width="3" fill="none"/>' },
                    ].map((line) => (
                      <button
                        key={line.id}
                        onClick={() => {
                          const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="50">${line.svg.replace(/currentColor/g, tintColor || '#3b82f6')}</svg>`;
                          const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
                          
                          const newElement: CollageElement = {
                            id: `ligne-${line.id}-${Date.now()}`,
                            type: "image",
                            src: svgDataUrl,
                            x: 100,
                            y: 200 + Math.random() * 50,
                            width: 200,
                            height: 30,
                            rotation: 0,
                            zIndex: collageElements.length + 1,
                            opacity: 1,
                          };
                          onUpdateElements([...collageElements, newElement]);
                          toast.success(language === "fr" ? `${line.name.fr} ajouté` : `${line.name.en} added`);
                        }}
                        className="p-2 rounded-lg border-2 border-gray-200 hover:border-purple-500 transition-all bg-white flex items-center justify-center h-12"
                        title={language === "fr" ? line.name.fr : line.name.en}
                      >
                        <svg viewBox="0 0 100 100" className="w-full h-6" style={{ color: tintColor || '#3b82f6' }}>
                          <g dangerouslySetInnerHTML={{ __html: line.svg }} />
                        </svg>
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                {/* Couleur des formes */}
                <div className="mt-4 pt-4 border-t">
                  <label className="text-xs text-gray-500 mb-2 block">
                    {language === "fr" ? "Couleur des formes" : "Shape Color"}
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#000000', '#6b7280', '#ffffff'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setTintColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          tintColor === color ? 'border-blue-500 scale-110' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* EXPORT */}
          <TabsContent value="export" className="h-full m-0">
            <div className="grid grid-cols-2 gap-6 h-full">
              {/* Options d'export */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  {language === "fr" ? "Options d'export" : "Export Options"}
                </h3>

                <div className="space-y-3">
                  <Button 
                    onClick={handlePreview}
                    variant="outline"
                    className="w-full"
                    disabled={collageElements.length === 0}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Prévisualiser" : "Preview"}
                  </Button>

                  <Button 
                    onClick={exportToPDF}
                    className="w-full"
                    disabled={collageElements.length === 0}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Exporter en PDF" : "Export as PDF"}
                  </Button>

                  <Button 
                    onClick={async () => {
                      const imageData = await generateCollageImage();
                      if (imageData) {
                        const link = document.createElement("a");
                        link.href = imageData;
                        link.download = `creation_${Date.now()}.png`;
                        link.click();
                        toast.success(language === "fr" ? "Image téléchargée !" : "Image downloaded!");
                      }
                    }}
                    variant="outline"
                    className="w-full"
                    disabled={collageElements.length === 0}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Télécharger en PNG" : "Download as PNG"}
                  </Button>

                  <Button 
                    onClick={exportToSVG}
                    variant="outline"
                    className="w-full border-green-300 text-green-700 hover:bg-green-50"
                    disabled={collageElements.length === 0}
                  >
                    <FileCode className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Exporter en SVG (vectoriel)" : "Export as SVG (vector)"}
                  </Button>
                </div>
              </div>

              {/* Prévisualisation */}
              <div className="bg-gray-50 rounded-xl p-4 flex flex-col">
                <h3 className="text-sm font-medium text-gray-700 mb-4">
                  {language === "fr" ? "Aperçu" : "Preview"}
                </h3>
                
                <div className="flex-1 flex items-center justify-center bg-white rounded-lg border-2 border-dashed border-gray-300">
                  {previewImage ? (
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">
                        {language === "fr" 
                          ? (language === 'fr' ? "Cliquez sur 'Prévisualiser' pour voir le résultat" : "Click 'Preview' to see the result") 
                          : "Click 'Preview' to see the result"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Instructions */}
      <div className="mx-6 mb-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          {language === "fr"
            ? (language === 'fr' ? "💡 Utilisez les templates pour organiser vos photos, ajoutez des bordures décoratives et exportez en PDF ou PNG." : "💡 Use templates to organize your photos, add decorative borders and export as PDF or PNG.")
            : "💡 Use templates to organize your photos, add decorative borders and export as PDF or PNG."}
        </p>
      </div>

      {/* Aperçu des éléments */}
      <div className="mx-6 mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          {language === "fr" ? "Éléments du collage" : "Collage elements"} ({collageElements.length})
        </h3>
        {collageElements.length === 0 ? (
          <div className="text-center text-gray-400 py-4 bg-gray-50 rounded-lg">
            <Square className="w-8 h-8 mx-auto mb-1 opacity-30" />
            <p className="text-xs">{language === "fr" ? "Aucun élément" : "No elements"}</p>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap bg-gray-50 rounded-lg p-2">
            {collageElements.map((el) => (
              <div
                key={el.id}
                className="w-12 h-12 bg-white rounded border flex items-center justify-center overflow-hidden shadow-sm"
              >
                {el.type === "image" && el.src && (
                  <img src={el.src} alt="" className="max-w-full max-h-full object-contain" />
                )}
                {el.type === "text" && (
                  <span className="text-[10px] truncate px-1">{el.text}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
