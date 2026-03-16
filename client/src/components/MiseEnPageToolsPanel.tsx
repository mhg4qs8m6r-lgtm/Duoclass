import { useState } from "react";
import { LayoutGrid, Grid2X2, Grid3X3, Rows, Columns, Square, RectangleHorizontal, RectangleVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";

interface MiseEnPageToolsPanelProps {
  onSelectLayout: (layoutData: LayoutData) => void;
}

interface LayoutData {
  type: string;
  rows: number;
  cols: number;
  gap: number;
  padding: number;
}

type LayoutType = "grid" | "mosaic" | "collage" | "libre";

export default function MiseEnPageToolsPanel({
  onSelectLayout,
}: MiseEnPageToolsPanelProps) {
  const { language } = useLanguage();
  const [layoutType, setLayoutType] = useState<LayoutType>("grid");
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [gap, setGap] = useState(10);
  const [padding, setPadding] = useState(20);
  const [equalSize, setEqualSize] = useState(true);
  
  // Types de mise en page
  const layoutTypes = [
    { id: "grid", label: "Grille", icon: Grid2X2 },
    { id: "mosaic", label: language === "fr" ? "Mosaïque" : "Mosaic", icon: LayoutGrid },
    { id: "collage", label: "Collage", icon: Grid3X3 },
    { id: "libre", label: language === "fr" ? "Libre" : "Free", icon: Square },
  ];
  
  // Modèles prédéfinis
  const presets = [
    { label: "2x2", rows: 2, cols: 2, icon: Grid2X2 },
    { label: "3x3", rows: 3, cols: 3, icon: Grid3X3 },
    { label: "1x2", rows: 1, cols: 2, icon: Columns },
    { label: "2x1", rows: 2, cols: 1, icon: Rows },
    { label: "1x3", rows: 1, cols: 3, icon: RectangleHorizontal },
    { label: "3x1", rows: 3, cols: 1, icon: RectangleVertical },
  ];
  
  // Appliquer la mise en page
  const handleApply = () => {
    onSelectLayout({
      type: layoutType,
      rows,
      cols,
      gap,
      padding,
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Type de mise en page */}
      <div>
        <Label className="text-xs font-medium text-gray-600 mb-2 block">
          {language === "fr" ? "Type de mise en page" : "Layout type"}
        </Label>
        <div className="grid grid-cols-2 gap-1">
          {layoutTypes.map((lt) => (
            <Button
              key={lt.id}
              variant={layoutType === lt.id ? "default" : "outline"}
              size="sm"
              className={`justify-start gap-2 text-xs ${layoutType === lt.id ? "bg-purple-500" : ""}`}
              onClick={() => setLayoutType(lt.id as LayoutType)}
            >
              <lt.icon className="w-3 h-3" />
              {lt.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Modèles prédéfinis */}
      {layoutType === "grid" && (
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-2 block">
            {language === "fr" ? "Modèles" : "Presets"}
          </Label>
          <div className="grid grid-cols-3 gap-1">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant={rows === preset.rows && cols === preset.cols ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => {
                  setRows(preset.rows);
                  setCols(preset.cols);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Options de grille */}
      {(layoutType === "grid" || layoutType === "mosaic") && (
        <div className="space-y-3 pt-2 border-t">
          <div>
            <Label className="text-xs text-gray-600">
              {language === "fr" ? "Lignes" : "Rows"}: {rows}
            </Label>
            <Slider
              value={[rows]}
              onValueChange={([v]) => setRows(v)}
              min={1}
              max={6}
              step={1}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="text-xs text-gray-600">
              {language === "fr" ? "Colonnes" : "Columns"}: {cols}
            </Label>
            <Slider
              value={[cols]}
              onValueChange={([v]) => setCols(v)}
              min={1}
              max={6}
              step={1}
              className="mt-1"
            />
          </div>
        </div>
      )}
      
      {/* Espacement */}
      <div className="space-y-3 pt-2 border-t">
        <div>
          <Label className="text-xs text-gray-600">
            {language === "fr" ? "Espacement" : "Gap"}: {gap}px
          </Label>
          <Slider
            value={[gap]}
            onValueChange={([v]) => setGap(v)}
            min={0}
            max={50}
            step={5}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label className="text-xs text-gray-600">
            {language === "fr" ? "Marge" : "Padding"}: {padding}px
          </Label>
          <Slider
            value={[padding]}
            onValueChange={([v]) => setPadding(v)}
            min={0}
            max={50}
            step={5}
            className="mt-1"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label className="text-xs text-gray-600">
            {language === "fr" ? "Tailles égales" : "Equal sizes"}
          </Label>
          <Switch checked={equalSize} onCheckedChange={setEqualSize} />
        </div>
      </div>
      
      {/* Bouton appliquer */}
      <Button
        className="w-full gap-2 bg-purple-500 hover:bg-purple-600"
        onClick={handleApply}
      >
        <LayoutGrid className="w-4 h-4" />
        {language === "fr" ? "Appliquer la mise en page" : "Apply layout"}
      </Button>
      
      {/* Info */}
      <p className="text-[10px] text-gray-500 text-center">
        {language === "fr" 
          ? "La mise en page sera appliquée au canvas"
          : "The layout will be applied to the canvas"}
      </p>
    </div>
  );
}
