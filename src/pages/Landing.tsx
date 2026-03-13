import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Camera, 
  FileText, 
  Shield, 
  Palette, 
  Cloud, 
  Smartphone,
  Check,
  Star,
  ArrowRight
} from "lucide-react";

export default function Landing() {
  const { user, loading, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  // Si l'utilisateur est déjà connecté, rediriger vers l'application
  useEffect(() => {
    if (isAuthenticated && !loading) {
      setLocation("/albums");
    }
  }, [isAuthenticated, loading, setLocation]);

  // Connexion OAuth Manus (pour les utilisateurs déjà inscrits)
  

  // Démarrage de l'essai gratuit : accès direct à l'application sans compte requis
  const handleLogin = () => {
  setLocation("/login");
};
  const features = [
    {
      icon: Camera,
      title: language === "fr" ? "Gestion de Photos" : "Photo Management",
      description: language === "fr" ? "Organisez vos photos par albums et catégories. Importez, classez et retrouvez facilement vos souvenirs." : "Organize your photos by albums and categories. Import, classify and easily find your memories."
    },
    {
      icon: FileText,
      title: language === "fr" ? "Gestion de Documents" : "Document Management",
      description: language === "fr" ? "Classez vos documents importants : factures, contrats, papiers administratifs. Tout au même endroit." : "Organize your important documents: invoices, contracts, papers. All in one place."
    },
    {
      icon: Shield,
      title: language === "fr" ? "Albums Sécurisés" : "Secure Albums",
      description: language === "fr" ? "Protégez vos contenus sensibles avec un code maître. Vos données privées restent privées." : "Protect your sensitive content with a master code. Your private data stays private."
    },
    {
      icon: Palette,
      title: language === "fr" ? "Personnalisation" : "Customization",
      description: language === "fr" ? "Choisissez parmi de nombreux thèmes, textures et couleurs pour personnaliser votre interface." : "Choose from many themes, textures and colors to customize your interface."
    },
    {
      icon: Cloud,
      title: language === "fr" ? "Stockage Local" : "Local Storage",
      description: language === "fr" ? "Vos photos et documents restent sur votre appareil. Seules les métadonnées sont synchronisées." : "Your photos and documents stay on your device. Only metadata is synchronized."
    },
    {
      icon: Smartphone,
      title: language === "fr" ? "Accessible Partout" : "Accessible Everywhere",
      description: language === "fr" ? "Accédez à votre organisation depuis n'importe quel appareil connecté à internet." : "Access your organization from any device connected to the internet."
    }
  ];

  const pricing = [
    {
      name: language === "fr" ? "Essai Gratuit" : "Free Trial",
      price: "0€",
      period: language === "fr" ? "14 jours" : "14 days",
      features: [
        language === "fr" ? "Toutes les fonctionnalités" : "All features",
        language === "fr" ? "200 photos maximum" : "200 photos maximum",
        language === "fr" ? "Sans engagement" : "No commitment",
        language === "fr" ? "Support par email" : "Email support"
      ],
      cta: language === "fr" ? "Commencer l'essai" : "Start trial",
      highlighted: false
    },
    {
      name: language === "fr" ? "Mensuel" : "Monthly",
      price: "4,99€",
      period: language === "fr" ? "/mois" : "/month",
      features: [
        language === "fr" ? "Photos illimitées" : "Unlimited photos",
        language === "fr" ? "Documents illimités" : "Unlimited documents",
        language === "fr" ? "Albums sécurisés" : "Secure albums",
        language === "fr" ? "Thèmes personnalisés" : "Custom themes",
        language === "fr" ? "Support prioritaire" : "Priority support"
      ],
      cta: language === "fr" ? "S'abonner" : "Subscribe",
      highlighted: false
    },
    {
      name: language === "fr" ? "Annuel" : "Annual",
      price: "49,99€",
      period: language === "fr" ? "/an" : "/year",
      features: [
        language === "fr" ? "Tout le plan Mensuel" : "All Monthly plan features",
        language === "fr" ? "2 mois offerts" : "2 months free",
        language === "fr" ? "Économisez 17%" : "Save 17%",
        language === "fr" ? "Mises à jour prioritaires" : "Priority updates",
        language === "fr" ? "Support premium" : "Premium support"
      ],
      cta: "S'abonner",
      highlighted: true
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/apple-touch-icon_3794c6b5.png" alt="DuoClass" className="h-10 w-10" />
            <span className="text-2xl font-bold text-blue-900">DuoClass</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#fonctionnalites" className="text-gray-600 hover:text-blue-600 transition-colors hidden sm:block">
              Fonctionnalités
            </a>
            <a href="#tarifs" className="text-gray-600 hover:text-blue-600 transition-colors hidden sm:block">
              Tarifs
            </a>
            <Button variant="outline" onClick={handleLogin}>
              Se connecter
            </Button>
            <Button onClick={handleStartFree}>
              Essai gratuit
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Star className="w-4 h-4" />
            Nouveau : Version Web disponible !
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            La gestion de vos <span className="text-blue-600">{language === 'fr' ? 'photos' : 'photos'}</span> et <span className="text-cyan-600">documents</span> maîtrisée
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Organisez, classez et retrouvez facilement tous vos fichiers importants. 
            Simple, sécurisé et accessible depuis n'importe où.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" onClick={handleStartFree}>
              Commencer gratuitement
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => document.getElementById('fonctionnalites')?.scrollIntoView({ behavior: 'smooth' })}>
              Découvrir les fonctionnalités
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            14 jours d'essai gratuit • Aucune carte bancaire requise
          </p>
        </div>
      </section>

      {/* Demo/Screenshot Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent to-blue-50/50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{language === "fr" ? "Une interface intuitive" : "An intuitive interface"}</h2>
            <p className="text-gray-600">{language === "fr" ? "Découvrez l'application DuoClass en action" : "Discover the DuoClass app in action"}</p>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-blue-500 bg-gray-100 min-h-[400px]">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/app-demo_a3c0feb6.png" 
              alt={language === "fr" ? "Capture d'écran de l'application DuoClass" : "DuoClass app screenshot"} 
              className="w-full h-auto"
              onError={(e) => {
                console.error('Image failed to load');
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <Camera className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="font-medium text-gray-900">{language === "fr" ? "Photos & Vidéos" : "Photos & Videos"}</p>
              <p className="text-sm text-gray-500">{language === "fr" ? "Organisez vos médias" : "Organize your media"}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium text-gray-900">{language === 'fr' ? 'Documents' : 'Documents'}</p>
              <p className="text-sm text-gray-500">{language === "fr" ? "Classez vos papiers" : "Organize your papers"}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <Shield className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <p className="font-medium text-gray-900">{language === "fr" ? "Sécurisé" : "Secured"}</p>
              <p className="text-sm text-gray-500">{language === "fr" ? "Albums privés" : "Private Albums"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              DuoClass combine puissance et simplicité pour vous offrir la meilleure expérience de gestion de fichiers.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-gray-200">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="tarifs" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tarifs simples et transparents
            </h2>
            <p className="text-xl text-gray-600">
              Commencez gratuitement, évoluez selon vos besoins.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {pricing.map((plan, index) => (
              <Card 
                key={index} 
                className={`p-8 relative ${plan.highlighted ? 'border-2 border-blue-500 shadow-xl scale-105' : 'border-gray-200'}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Recommandé
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={handleStartFree}
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à organiser vos fichiers ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez des milliers d'utilisateurs qui font confiance à DuoClass pour gérer leurs photos et documents.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="text-lg px-8 py-6"
            onClick={handleStartFree}
          >
            Démarrer mon essai gratuit
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/apple-touch-icon_3794c6b5.png" alt="DuoClass" className="h-8 w-8" />
                <span className="text-xl font-bold text-white">DuoClass</span>
              </div>
              <p className="text-sm">
                La gestion de vos photos et documents maîtrisée.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">{language === "fr" ? "Produit" : "Product"}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">{language === "fr" ? "Fonctionnalités" : "Features"}</a></li>
                <li><a href="#tarifs" className="hover:text-white transition-colors">{language === "fr" ? "Tarifs" : "Pricing"}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{language === "fr" ? "Mises à jour" : "Updates"}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">{language === "fr" ? "Support" : "Support"}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{language === "fr" ? "Centre d'aide" : "Help center"}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{language === "fr" ? "Contact" : "Contact"}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{language === "fr" ? "FAQ" : "FAQ"}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">{language === "fr" ? "Légal" : "Legal"}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{language === "fr" ? "Mentions légales" : "Legal notices"}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{language === "fr" ? "Politique de confidentialité" : "Privacy policy"}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{language === "fr" ? "CGV" : "Terms of sale"}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>{language === "fr" ? "© 2026 DuoClass. Tous droits réservés. Marque déposée." : "© 2026 DuoClass. All rights reserved. Registered trademark."}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
