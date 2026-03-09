/**
 * Sélecteur de langue FR/EN pour le header
 */
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const handleToggle = () => {
    setLanguage(language === 'fr' ? 'en' : 'fr');
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 transition-all duration-200",
        "hover:shadow-md hover:scale-105 active:scale-95",
        "bg-white border-gray-300 hover:border-blue-400"
      )}
      title={language === 'fr' ? 'Switch to English' : 'Passer en Français'}
    >
      <span className={cn(
        "text-sm font-bold transition-colors",
        language === 'fr' ? "text-blue-600" : "text-gray-400"
      )}>
        FR
      </span>
      <span className="text-gray-300">/</span>
      <span className={cn(
        "text-sm font-bold transition-colors",
        language === 'en' ? "text-blue-600" : "text-gray-400"
      )}>
        EN
      </span>
    </button>
  );
}
