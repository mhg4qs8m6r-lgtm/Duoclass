import { ReactNode } from "react";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useLanguage } from '@/contexts/LanguageContext';
import { Lock } from "lucide-react";

interface TrialBlockerProps {
  children: ReactNode;
}

export function TrialBlocker({ children }: TrialBlockerProps) {
  const { isExpired, isPremium, isLoading } = useTrialStatus();
  const [, setLocation] = useLocation();

  // Afficher le contenu si premium ou si l'essai n'est pas expiré
  if (isLoading || isPremium || !isExpired) {
    return <>{children}</>;
  }

  // Bloquer l'accès si l'essai est expiré
  const { language } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {language === 'fr' ? "Période d'essai terminée" : 'Trial period ended'}
          </h1>
          <p className="text-lg text-gray-600">
            {language === 'fr' ? "Votre période d'essai de 14 jours est arrivée à son terme." : 'Your 14-day trial period has ended.'}
          </p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6 text-left">
          <h2 className="text-xl font-bold text-blue-800 mb-3">
            {language === 'fr' ? 'Vos données sont en sécurité 💾' : 'Your data is safe 💾'}
          </h2>
          <ul className="space-y-2 text-blue-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">✓</span>
              <span>{language === 'fr' ? 'Toutes vos photos et documents sont sauvegardés' : 'All your photos and documents are saved'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">✓</span>
              <span>{language === 'fr' ? 'Vos albums et métadonnées sont conservés' : 'Your albums and metadata are preserved'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">✓</span>
              <span>{language === 'fr' ? 'Accès immédiat après activation de la version officielle' : 'Immediate access after activating the official version'}</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={() => setLocation("/parametres")}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg py-6"
          >
            🎉 Acheter la version officielle
          </Button>
          
          <div className="text-sm text-gray-500">
            <p className="mb-2">{language === 'fr' ? <>✨ <strong>Licence perpétuelle</strong> : L'application fonctionne à vie</> : <>✨ <strong>Perpetual license</strong>: The application works for life</>}</p>
            <p>{language === 'fr' ? <>🔒 <strong>Confidentialité garantie</strong> : Vos données restent privées</> : <>🔒 <strong>Guaranteed privacy</strong>: Your data remains private</>}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
