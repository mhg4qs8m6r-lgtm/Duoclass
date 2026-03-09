import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Crown, 
  Check, 
  Sparkles, 
  Shield, 
  Zap, 
  Camera, 
  FileText,
  ArrowLeft,
  Loader2,
  Gift
} from "lucide-react";
import Turnstile from "@/components/Turnstile";

export default function Paiement() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const [showRetractationModal, setShowRetractationModal] = useState(false);
  const [retractationAccepted, setRetractationAccepted] = useState(false);

  // Vérifier si l'utilisateur revient d'un paiement annulé
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("cancelled") === "true") {
      toast.error(language === "fr" 
        ? language === "fr" ? "Paiement annulé. Vous pouvez réessayer quand vous le souhaitez." : "Payment cancelled. You can try again whenever you want." 
        : "Payment cancelled. You can try again whenever you want.");
    }
  }, [searchString, language]);

  // Récupérer les plans disponibles
  const { data: plans } = trpc.payment.getPlans.useQuery();
  
  // Mutation pour créer une session de paiement
  const createCheckout = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info(language === "fr" 
          ? language === "fr" ? "Redirection vers le paiement sécurisé..." : "Redirecting to secure payment..." 
          : "Redirecting to secure payment...");
        // Ouvrir Stripe Checkout dans un nouvel onglet
        window.open(data.url, "_blank");
      }
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("Erreur lors de la création de la session:", error);
      toast.error(language === "fr" 
        ? language === "fr" ? "Une erreur est survenue. Veuillez réessayer." : "An error occurred. Please try again." 
        : "An error occurred. Please try again.");
      setIsLoading(false);
    },
  });

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error(language === "fr" 
        ? "Veuillez vous connecter pour acheter." 
        : "Please log in to purchase.");
      return;
    }
    
    // Vérifier que l'utilisateur a accepté les conditions de rétractation
    if (!retractationAccepted) {
      setShowRetractationModal(true);
      toast.error(language === "fr" 
        ? language === "fr" ? "Veuillez accepter les conditions de rétractation." : "Please accept the withdrawal conditions." 
        : "Please accept the withdrawal conditions.");
      return;
    }
    
    // Vérifier le token Turnstile
    if (!turnstileToken) {
      toast.error(language === "fr" 
        ? language === "fr" ? "Veuillez compléter la vérification de sécurité." : "Please complete the security verification." 
        : "Please complete the security verification.");
      return;
    }
    
    setIsLoading(true);
    
    // Vérifier le token côté serveur
    try {
      const verifyResponse = await fetch("/api/turnstile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });
      const verifyData = await verifyResponse.json();
      
      if (!verifyData.success) {
        toast.error(language === "fr" 
          ? language === "fr" ? "Vérification de sécurité échouée. Veuillez réessayer." : "Security verification failed. Please try again." 
          : "Security verification failed. Please try again.");
        setIsLoading(false);
        setTurnstileToken(null);
        return;
      }
    } catch (error) {
      console.error("Erreur de vérification Turnstile:", error);
      // En cas d'erreur, on continue quand même (fail-open pour ne pas bloquer les utilisateurs légitimes)
    }
    
    createCheckout.mutate({ planId: "lifetime" });
  };
  
  // Callback quand Turnstile est vérifié
  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
    setTurnstileVerified(true);
  };
  
  // Callback quand Turnstile expire
  const handleTurnstileExpire = () => {
    setTurnstileToken(null);
    setTurnstileVerified(false);
  };

  const features = language === "fr" ? [
    { icon: Camera, text: language === "fr" ? "Stockage illimité de photos et vidéos" : "Unlimited photo and video storage" },
    { icon: FileText, text: language === "fr" ? "Gestion illimitée de documents" : "Unlimited document management" },
    { icon: Shield, text: language === "fr" ? "Albums privés sécurisés" : "Secure private albums" },
    { icon: Zap, text: language === "fr" ? "Accès sur tous vos appareils" : "Access on all your devices" },
    { icon: Sparkles, text: language === "fr" ? "Retouche photo intégrée" : "Built-in photo editing" },
    { icon: Check, text: language === "fr" ? "Export et impression haute qualité" : "High quality export and printing" },
  ] : [
    { icon: Camera, text: "Unlimited photo and video storage" },
    { icon: FileText, text: "Unlimited document management" },
    { icon: Shield, text: "Secure private albums" },
    { icon: Zap, text: "Access on all your devices" },
    { icon: Sparkles, text: "Built-in photo editing" },
    { icon: Check, text: "High quality export and printing" },
  ];

  const texts = {
    fr: {
      title: "Achetez DuoClass",
      subtitle: "Une seule fois, pour toujours",
      lifetime: language === "fr" ? "Licence à vie" : "Lifetime license",
      oneTimePayment: "Paiement unique",
      noSubscription: "Pas d'abonnement",
      purchase: "Acheter maintenant",
      purchasing: "Redirection...",
      trialInfo: language === "fr" ? "Vous bénéficiez actuellement de 14 jours d'essai gratuit" : "You currently have a 14-day free trial",
      securePayment: language === "fr" ? "Paiement sécurisé par Stripe" : "Secure payment by Stripe",
      lifetimeAccess: language === "fr" ? "Accès à vie" : "Lifetime access",
      back: "Retour",
      features: "Tout est inclus",
      testCard: "Pour tester, utilisez la carte : 4242 4242 4242 4242",
      whyLifetime: "Pourquoi un paiement unique ?",
      reason1: language === "fr" ? "Pas de frais récurrents" : "No recurring fees",
      reason2: language === "fr" ? "Mises à jour incluses" : "Updates included",
      reason3: "Pas de mauvaises surprises",
    },
    en: {
      title: "Buy DuoClass",
      subtitle: "Once and forever",
      lifetime: "Lifetime license",
      oneTimePayment: "One-time payment",
      noSubscription: "No subscription",
      purchase: "Buy now",
      purchasing: "Redirecting...",
      trialInfo: "You currently have a 14-day free trial",
      securePayment: "Secure payment by Stripe",
      lifetimeAccess: "Lifetime access",
      back: "Back",
      features: "Everything included",
      testCard: "For testing, use card: 4242 4242 4242 4242",
      whyLifetime: "Why a one-time payment?",
      reason1: "No recurring fees",
      reason2: "Updates included",
      reason3: "No bad surprises",
    }
  };

  const txt = texts[language as keyof typeof texts] || texts.fr;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/albums">
            <Button variant="ghost" className="mb-6 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {txt.back}
            </Button>
          </Link>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-10 h-10 text-yellow-500" />
            <h1 className="text-4xl font-bold text-gray-900">{txt.title}</h1>
          </div>
          <p className="text-xl text-gray-600">{txt.subtitle}</p>
        </div>

        {/* Carte de prix unique */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-blue-500 mb-8 relative overflow-hidden">
          {/* Badge */}
          <div className="absolute -top-1 -right-1">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold px-4 py-2 rounded-bl-2xl">
              <Gift className="w-4 h-4 inline mr-1" />
              {txt.lifetime}
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="mb-4">
              <span className="text-6xl font-bold text-gray-900">
                {plans?.[0]?.price ? `${(plans[0].price / 100).toFixed(2).replace('.', ',')} €` : "49,00 €"}
              </span>
            </div>
            <p className="text-lg text-gray-600">{txt.oneTimePayment}</p>
            <p className="text-sm text-green-600 font-medium mt-2">
              ✓ {txt.noSubscription}
            </p>
          </div>

          {/* Vérification de sécurité Turnstile */}
          <div className="flex justify-center mb-4">
            <Turnstile
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
              theme="light"
              language={language}
            />
          </div>
          
          {/* Indicateur de vérification */}
          {turnstileVerified && (
            <div className="flex items-center justify-center gap-2 text-green-600 text-sm mb-4">
              <Check className="w-4 h-4" />
              {language === "fr" ? "Vérification réussie" : "Verification successful"}
            </div>
          )}
          
          {/* Checkbox Droit de rétractation */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200 mb-4">
            <input
              type="checkbox"
              id="retractation-check"
              checked={retractationAccepted}
              onChange={(e) => setRetractationAccepted(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 mt-0.5"
            />
            <label htmlFor="retractation-check" className="text-sm text-gray-700 flex-1">
              {language === "fr" 
                ? language === "fr" ? "J'accepte les conditions de rétractation (14 jours)." : "I accept the withdrawal conditions (14 days)."
                : "I accept the withdrawal conditions (14 days)."}
            </label>
          </div>

          {/* Bouton Acheter */}
          <Button 
            size="lg" 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            onClick={handlePurchase}
            disabled={isLoading || !turnstileVerified}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {txt.purchasing}
              </>
            ) : (
              <>
                <Crown className="w-5 h-5 mr-2" />
                {txt.purchase}
              </>
            )}
          </Button>
          
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              {txt.securePayment}
            </span>
            <span>•</span>
            <span>{txt.lifetimeAccess}</span>
          </div>

          {/* Info carte de test */}
          <p className="mt-4 text-xs text-gray-400 bg-gray-100 text-center px-3 py-2 rounded">
            {txt.testCard}
          </p>
        </div>

        {/* Pourquoi paiement unique */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            {txt.whyLifetime}
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-700">{txt.reason1}</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-700">{txt.reason2}</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-700">{txt.reason3}</p>
            </div>
          </div>
        </div>

        {/* Fonctionnalités */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            {txt.features}
          </h3>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-gray-700">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info période d'essai */}
        <p className="text-center text-sm text-gray-500 mt-8">
          {txt.trialInfo}
        </p>
      </div>
    </div>
  );
}
