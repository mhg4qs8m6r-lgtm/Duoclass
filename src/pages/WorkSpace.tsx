import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function WorkSpace() {
  const { language } = useLanguage();
  return (
    <Layout title={language === 'fr' ? "Surface de Travail" : "Workspace"}>
      {/* Empty Workspace Area */}
      <div className="w-full h-full flex items-center justify-center bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
        <div className="text-center text-gray-400 select-none pointer-events-none">
          <p className="text-sm">{language === 'fr' ? 'Zone de travail vide' : 'Empty workspace'}</p>
          <p className="text-xs mt-1">{language === 'fr' ? "Glissez des éléments ici ou utilisez la barre d'outils" : 'Drag items here or use the toolbar'}</p>
        </div>
      </div>
    </Layout>
  );
}
