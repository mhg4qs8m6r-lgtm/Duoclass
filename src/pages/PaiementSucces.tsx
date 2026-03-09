import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { CheckCircle, Crown, ArrowRight, Sparkles, Copy, Key, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function PaiementSucces() {
  const { language } = useLanguage();
  const searchString = useSearch();
  const [copied, setCopied] = useState(false);
  
  // Récupérer l'ID de session
  const params = new URLSearchParams(searchString);
  const sessionId = params.get("session_id");

  // Récupérer la licence de l'utilisateur
  const { data: licensesData, isLoading } = trpc.license.getMyLicenses.useQuery();
  // Prendre la première licence (la plus récente)
  const licenseData = licensesData && licensesData.length > 0 ? licensesData[0] : null;

  // Animation de confettis au chargement
  useEffect(() => {
    import("canvas-confetti").then((confettiModule) => {
      const confetti = confettiModule.default;
      
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          particleCount,
          startVelocity: 30,
          spread: 360,
          origin: {
            x: randomInRange(0.1, 0.3),
            y: Math.random() - 0.2,
          },
          colors: ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981"],
        });
        confetti({
          particleCount,
          startVelocity: 30,
          spread: 360,
          origin: {
            x: randomInRange(0.7, 0.9),
            y: Math.random() - 0.2,
          },
          colors: ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981"],
        });
      }, 250);

      return () => clearInterval(interval);
    }).catch(() => {
      // Ignorer si canvas-confetti n'est pas disponible
    });
  }, []);

  const copyLicenseCode = () => {
    if (licenseData?.licenseCode) {
      navigator.clipboard.writeText(licenseData.licenseCode);
      setCopied(true);
      toast.success(language === "fr" ? "Code copié !" : "Code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const texts = {
    fr: {
      title: "Bienvenue dans DuoClass Premium !",
      subtitle: language === "fr" ? "Votre licence a été activée avec succès" : "Your license has been activated successfully",
      description: language === "fr" ? "Vous avez maintenant accès à toutes les fonctionnalités de DuoClass sans aucune limitation." : "You now have access to all DuoClass features without any limitations.",
      licenseTitle: "Votre code de licence",
      licenseDescription: language === "fr" ? "Conservez précieusement ce code. Il vous permettra d'activer DuoClass sur un nouvel appareil." : "Keep this code safe. It will allow you to activate DuoClass on a new device.",
      copyCode: "Copier le code",
      copied: language === "fr" ? "Copié !" : "Copied!",
      emailSent: language === "fr" ? "Un email avec votre code de licence a été envoyé à votre adresse." : "An email with your license code has been sent to your address.",
      features: [
        language === "fr" ? "Stockage illimité de photos et documents" : "Unlimited photo and document storage",
        "Albums privés sécurisés",
        "Synchronisation multi-appareils",
        "Support prioritaire",
        language === "fr" ? "Mises à jour à vie" : "Lifetime updates",
      ],
      cta: language === "fr" ? "Commencer à utiliser DuoClass" : "Start using DuoClass",
      manageSubscription: language === "fr" ? "Gérer ma licence" : "Manage my license",
      loading: "Chargement de votre licence...",
    },
    en: {
      title: "Welcome to DuoClass Premium!",
      subtitle: "Your license has been successfully activated",
      description: "You now have access to all DuoClass features without any limitations.",
      licenseTitle: "Your license code",
      licenseDescription: "Keep this code safe. It will allow you to activate DuoClass on a new device.",
      copyCode: "Copy code",
      copied: "Copied!",
      emailSent: "An email with your license code has been sent to your address.",
      features: [
        "Unlimited photo and document storage",
        "Secure private albums",
        "Multi-device sync",
        "Priority support",
        "Lifetime updates",
      ],
      cta: "Start using DuoClass",
      manageSubscription: "Manage my license",
      loading: "Loading your license...",
    }
  };

  const txt = texts[language as keyof typeof texts] || texts.fr;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Icône de succès */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle className="w-14 h-14 text-green-500" />
          </div>
          <div className="absolute top-0 right-1/4 animate-pulse">
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="absolute bottom-0 left-1/4 animate-pulse delay-150">
            <Crown className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        {/* Titre */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {txt.title}
        </h1>
        <p className="text-xl text-green-600 font-medium mb-4">
          {txt.subtitle}
        </p>
        <p className="text-gray-600 mb-6">
          {txt.description}
        </p>

        {/* Code de licence */}
        {isLoading ? (
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200 mb-6">
            <p className="text-gray-500">{txt.loading}</p>
          </div>
        ) : licenseData?.licenseCode ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 shadow-lg border-2 border-blue-200 mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Key className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">{txt.licenseTitle}</h3>
            </div>
            
            <div className="bg-white rounded-lg p-4 mb-3 border border-blue-100">
              <code className="text-2xl font-mono font-bold text-blue-600 tracking-wider">
                {licenseData.licenseCode}
              </code>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyLicenseCode}
              className="mb-3"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copied ? txt.copied : txt.copyCode}
            </Button>
            
            <p className="text-sm text-gray-600">
              {txt.licenseDescription}
            </p>
            
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-green-600">
              <Mail className="w-4 h-4" />
              <span>{txt.emailSent}</span>
            </div>
          </div>
        ) : null}

        {/* Liste des fonctionnalités */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <ul className="space-y-3 text-left">
            {txt.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Boutons */}
        <div className="space-y-3">
          <Link href="/albums">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              {txt.cta}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          
          <Link href="/parametres">
            <Button variant="outline" size="lg" className="w-full">
              {txt.manageSubscription}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
