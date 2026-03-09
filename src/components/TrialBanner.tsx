import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle, X, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrialBannerProps {
  onUpgrade?: () => void;
}

export default function TrialBanner({ onUpgrade }: TrialBannerProps) {
  const { language } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  
  // Récupérer le statut de l'abonnement
  const { data: subscriptionStatus, isLoading } = trpc.subscription.getStatus.useQuery(undefined, {
    refetchInterval: 60000, // Rafraîchir toutes les minutes
  });

  // Ne pas afficher si chargement, pas de données, ou si l'utilisateur a une licence active
  if (isLoading || !subscriptionStatus) return null;
  if (subscriptionStatus.status === "active") return null;
  if (subscriptionStatus.plan === "lifetime") return null;
  if (dismissed) return null;

  const isTrial = subscriptionStatus.status === "trial";

  // Messages traduits
  const messages = {
    fr: {
      trialInfo: "Vous êtes en période d'essai",
      upgrade: "Acheter la licence",
      upgradeNow: "Acheter maintenant",
    },
    en: {
      trialInfo: "You are in trial period",
      upgrade: "Buy license",
      upgradeNow: "Buy now",
    }
  };

  const msg = messages[language as keyof typeof messages] || messages.fr;

  if (!isTrial) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-500" />
        
        <div className="flex items-center gap-4">
          <span className="font-medium text-blue-800">
            {msg.trialInfo}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Bouton Acheter */}
        <Link href="/paiement">
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
            onClick={onUpgrade}
          >
            <Crown className="w-4 h-4" />
            {msg.upgrade}
          </Button>
        </Link>

        {/* Bouton fermer */}
        <button 
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-white/50 text-blue-800 opacity-60 hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
