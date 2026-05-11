interface ClipToShapeToolboxProps {
  language: "fr" | "en";
  onClip: () => void;
}

export default function ClipToShapeToolbox({ language, onClip }: ClipToShapeToolboxProps) {
  const isFr = language === "fr";

  return (
    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <p className="text-sm font-semibold text-blue-800 mb-2">
        {isFr ? "Mise en forme / Cadrage" : "Shape & Crop"}
      </p>
      <p className="text-xs text-blue-700 mb-3 leading-relaxed">
        {isFr
          ? "Dimensionnez l'image et la forme selon votre besoin, puis cliquez sur Appliquer. L'image prendra exactement la forme choisie — l'extérieur sera supprimé."
          : "Resize the image and shape as needed, then click Apply. The image will be cropped to the selected shape."}
      </p>
      <button
        onClick={onClip}
        className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
      >
        {isFr ? "✂️ Appliquer" : "✂️ Apply"}
      </button>
    </div>
  );
}
