import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";

import { useLocation } from "wouter";
import { useEffect, useState, useRef, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Camera,
  Sparkles,
  Shield,
  ShieldCheck,
  Palette,
  Send,
  ImageIcon,
  Scissors,
  Printer,
  X,
  Play,
  Image as ImageLucide,
} from "lucide-react";

import photo1 from "@/assets/photo 1.jpeg";
import photo2 from "@/assets/photo 2.jpeg";
import photo3 from "@/assets/photo 3.jpeg";
import photo4 from "@/assets/photo 4.jpg";
import photo5 from "@/assets/photo 5 .jpeg";
import photo6 from "@/assets/photo 6.jpeg";
import photo7 from "@/assets/photo 7.jpg";
import photo8 from "@/assets/photo 8.jpeg";
import photo9 from "@/assets/photo 9.jpg";
import photo10 from "@/assets/photo 10.jpeg";
import photo11 from "@/assets/photo 11 .jpeg";
import photo12 from "@/assets/photo 12 .jpeg";

/* ────────────── Photo Carousel (12 photos, 3 visible) ────────────── */
const CAROUSEL_PHOTOS = [
  { id: 1, src: photo1 },
  { id: 2, src: photo2 },
  { id: 3, src: photo3 },
  { id: 4, src: photo4 },
  { id: 5, src: photo5 },
  { id: 6, src: photo6 },
  { id: 7, src: photo7 },
  { id: 8, src: photo8 },
  { id: 9, src: photo9 },
  { id: 10, src: photo10 },
  { id: 11, src: photo11 },
  { id: 12, src: photo12 },
];

const PHOTOS_PER_PAGE = 3;
const TOTAL_PAGES = Math.ceil(CAROUSEL_PHOTOS.length / PHOTOS_PER_PAGE);

function PhotoCarousel() {
  const [page, setPage] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((p: number) => setPage(p), []);

  // Auto-slide every 5.5s
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setPage((prev) => (prev + 1) % TOTAL_PAGES);
    }, 5500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Reset timer on manual navigation
  const handleDot = (p: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    goTo(p);
    timerRef.current = setInterval(() => {
      setPage((prev) => (prev + 1) % TOTAL_PAGES);
    }, 5500);
  };

  const visiblePhotos = CAROUSEL_PHOTOS.slice(
    page * PHOTOS_PER_PAGE,
    page * PHOTOS_PER_PAGE + PHOTOS_PER_PAGE,
  );

  return (
    <div>
      <div className="flex gap-5 justify-center transition-all duration-500 ease-in-out">
        {visiblePhotos.map((photo) => (
          <div
            key={photo.id}
            className="w-1/3 aspect-[3/2] rounded-2xl shadow-xl border-2 border-white/50 overflow-hidden transition-opacity duration-500"
          >
            <img
              src={photo.src}
              alt={`Photo ${photo.id}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      {/* Navigation dots */}
      <div className="flex justify-center gap-2 mt-5">
        {Array.from({ length: TOTAL_PAGES }, (_, i) => (
          <button
            key={i}
            onClick={() => handleDot(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i === page
                ? "bg-orange-500 scale-125"
                : "bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Page ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ────────────── Clickable screenshot card ────────────── */
const PlaceholderScreen = ({
  title,
  icon: Icon,
  gradient,
  onClick,
}: {
  title: string;
  icon: React.ElementType;
  gradient: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`rounded-2xl overflow-hidden shadow-lg border-2 border-white/40 aspect-[16/10] flex flex-col items-center justify-center gap-3 cursor-pointer transition-transform hover:scale-105 hover:shadow-xl ${gradient}`}
  >
    <Icon className="w-10 h-10 text-white drop-shadow-md" />
    <span className="text-white font-bold text-sm drop-shadow-md text-center px-2">
      {title}
    </span>
    <span className="text-white/70 text-xs font-medium">
      Cliquez pour en savoir +
    </span>
  </button>
);

export default function Landing() {
  const { loading, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      setLocation("/albums");
    }
  }, [isAuthenticated, loading, setLocation]);

  const handleLogin = () => setLocation("/login");
  const handleStartFree = () => setLocation("/register");
  const handleBuy = () => setLocation("/register?plan=lifetime");

  const fr = language === "fr";
  const [openModal, setOpenModal] = useState<number | null>(null);

  const featureModals = [
    {
      emoji: "📷",
      title: fr ? "Albums & Catégories" : "Albums & Categories",
      icon: Camera,
      gradient: "from-cyan-400 to-blue-500",
      description: fr
        ? "Classez vos photos par albums et catégories — organisez chaque photo individuellement, sans déranger les autres."
        : "Sort your photos by albums and categories — organize each photo individually without disturbing the others.",
      placeholder: fr ? "Vidéo de démonstration à venir" : "Demo video coming soon",
      placeholderIcon: Play,
    },
    {
      emoji: "✨",
      title: fr ? "Retouche & Effets" : "Retouch & Effects",
      icon: Sparkles,
      gradient: "from-pink-400 to-purple-500",
      description: fr
        ? "Retouchez vos images avec de multiples effets\u00A0: Noir & Blanc, Sépia, Aquarelle, Peinture à l'huile, et bien plus encore."
        : "Retouch your images with multiple effects: Black & White, Sepia, Watercolor, Oil Painting, and much more.",
      placeholder: fr ? "Photo de démonstration à venir" : "Demo photo coming soon",
      placeholderIcon: ImageLucide,
    },
    {
      emoji: "🎨",
      title: fr ? "Atelier Créatif" : "Creative Workshop",
      icon: Scissors,
      gradient: "from-orange-400 to-red-500",
      description: fr
        ? "Créez des détourages, collages, passe-partout, pêle-mêle et puzzles pour découpe laser."
        : "Create cutouts, collages, matting, montages and puzzles for laser cutting.",
      placeholder: fr ? "Photo de démonstration à venir" : "Demo photo coming soon",
      placeholderIcon: ImageLucide,
    },
    {
      emoji: "📤",
      title: fr ? "Import & Partage" : "Import & Share",
      icon: Send,
      gradient: "from-emerald-400 to-teal-500",
      description: fr
        ? "Importez, imprimez, envoyez par @Mail, convertissez les formats et créez des diaporamas."
        : "Import, print, send by email, convert formats and create slideshows.",
      placeholder: null,
      placeholderIcon: null,
    },
    {
      emoji: "🔒",
      title: fr ? "Albums Privés" : "Private Albums",
      icon: Shield,
      gradient: "from-purple-400 to-indigo-500",
      description: fr
        ? "Sécurisez vos albums privés avec un code personnel — vos documents deviennent confidentiels, vos souvenirs restent discrets."
        : "Secure your private albums with a personal code — your documents and memories stay private.",
      placeholder: fr ? "Photo de démonstration à venir" : "Demo photo coming soon",
      placeholderIcon: ImageLucide,
    },
    {
      emoji: "🛡️",
      title: fr ? "Contrôle Parental & Détection des Doublons" : "Parental Control & Duplicate Detection",
      icon: ShieldCheck,
      gradient: "from-violet-500 to-purple-600",
      description: fr
        ? "Protégez vos enfants avec le contrôle parental intégré et détectez automatiquement les photos en double pour libérer de l'espace."
        : "Protect your children with built-in parental controls and automatically detect duplicate photos to free up space.",
      placeholder: fr ? "Photo de démonstration à venir" : "Demo photo coming soon",
      placeholderIcon: ImageLucide,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-100 via-orange-50 to-cyan-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-cyan-50 overflow-x-hidden">
      {/* ───── Header ───── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-orange-200/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/apple-touch-icon_3794c6b5.png"
              alt="DuoClass"
              className="h-16 w-16 drop-shadow-md"
            />
            <div className="flex flex-col">
              <span className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent leading-tight">
                DuoClass
              </span>
              <span className="text-xs text-gray-500 font-medium italic hidden sm:block">
                {fr ? "La gestion de vos photos et documents maîtrisée" : "Your photos and documents, mastered"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-orange-600"
              onClick={handleLogin}
            >
              {fr ? "Se connecter" : "Sign in"}
            </Button>
            <Button
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 shadow-md shadow-orange-200"
              onClick={handleStartFree}
            >
              {fr ? "Essai gratuit" : "Free trial"}
            </Button>
          </div>
        </div>
      </header>

      {/* ───── Hero ───── */}
      <section className="pt-28 pb-6 px-4">
        <div className="container mx-auto text-center max-w-5xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
            {fr
              ? "Chaque instant mérite une photo"
              : "Every moment deserves a photo"}
          </h1>

          {/* Carrousel grand format */}
          <div className="mb-8">
            <PhotoCarousel />
          </div>

          {/* Accroche */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-8 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
            {fr
              ? "Créez, organisez vos albums... retouchez vos photos"
              : "Create, organize your albums... retouch your photos"}
          </h2>

          {/* Pricing cards */}
          <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto mb-2">
            {/* Free trial */}
            <div className="relative rounded-3xl border-2 border-orange-300 bg-white p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="absolute -top-3 left-6 bg-gradient-to-r from-orange-400 to-pink-400 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                {fr ? "DÉCOUVERTE" : "DISCOVERY"}
              </div>
              <div className="text-center mb-6 mt-2">
                <p className="text-5xl font-extrabold text-gray-900">0 €</p>
                <p className="text-gray-500 mt-1">
                  {fr ? "15 jours • version intégrale" : "15 days • full version"}
                </p>
              </div>
              <ul className="space-y-2 mb-8 text-gray-600 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {fr ? "Toutes les fonctionnalités" : "All features"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {fr ? "Sans carte bancaire" : "No credit card"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {fr ? "Sans engagement" : "No commitment"}
                </li>
              </ul>
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-xl py-5 text-base font-bold shadow-md"
                onClick={handleStartFree}
              >
                🆓 {fr ? "Essayer gratuitement" : "Try for free"}
              </Button>
            </div>

            {/* Lifetime */}
            <div className="relative rounded-3xl border-2 border-purple-400 bg-white p-8 shadow-lg hover:shadow-xl transition-shadow ring-2 ring-purple-200">
              <div className="absolute -top-3 left-6 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                {fr ? "LICENCE À VIE" : "LIFETIME LICENSE"}
              </div>
              <div className="text-center mb-6 mt-2">
                <p className="text-5xl font-extrabold text-gray-900">49 €</p>
                <p className="text-gray-500 mt-1">
                  {fr ? "une seule fois, pour toujours" : "one-time, forever"}
                </p>
              </div>
              <ul className="space-y-2 mb-8 text-gray-600 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {fr ? "Toutes les fonctionnalités" : "All features"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {fr ? "Licence perpétuelle" : "Perpetual license"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {fr ? "Sans abonnement" : "No subscription"}
                </li>
              </ul>
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl py-5 text-base font-bold shadow-md"
                onClick={handleBuy}
              >
                💳 {fr ? "Acheter la licence" : "Buy license"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Screenshots Grid ───── */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {featureModals.map((feat, i) => (
              <PlaceholderScreen
                key={i}
                title={feat.title}
                icon={feat.icon}
                gradient={`bg-gradient-to-br ${feat.gradient}`}
                onClick={() => setOpenModal(i)}
              />
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-3 italic">
            {fr
              ? "Cliquez sur une vignette pour en savoir plus"
              : "Click a card to learn more"}
          </p>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="py-10 px-4 bg-gray-900 text-gray-400">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663160465265/HGNqEaMegiV5gx7a5nB5zp/apple-touch-icon_3794c6b5.png"
                alt="DuoClass"
                className="h-7 w-7"
              />
              <span className="text-lg font-bold text-white">DuoClass</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a
                href="/mentions-legales"
                className="hover:text-white transition-colors"
              >
                {fr ? "Mentions légales" : "Legal"}
              </a>
              <a
                href="/politique-confidentialite"
                className="hover:text-white transition-colors"
              >
                {fr ? "Confidentialité" : "Privacy"}
              </a>
              <a href="/cgu" className="hover:text-white transition-colors">
                {fr ? "CGU" : "Terms"}
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-xs">
            <p>
              {fr
                ? "© 2026 DuoClass. Tous droits réservés. Marque déposée."
                : "© 2026 DuoClass. All rights reserved. Registered trademark."}
            </p>
          </div>
        </div>
      </footer>

      {/* ───── Feature Modal ───── */}
      {openModal !== null && (() => {
        const feat = featureModals[openModal];
        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setOpenModal(null)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header gradient */}
              <div className={`bg-gradient-to-r ${feat.gradient} px-8 py-6 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <feat.icon className="w-8 h-8 text-white" />
                  <h3 className="text-2xl font-bold text-white">
                    {feat.emoji} {feat.title}
                  </h3>
                </div>
                <button
                  onClick={() => setOpenModal(null)}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6">
                <p className="text-gray-700 text-lg leading-relaxed">
                  {feat.description}
                </p>

                {/* Media placeholder */}
                {feat.placeholder && feat.placeholderIcon && (
                  <div className={`rounded-2xl bg-gradient-to-br ${feat.gradient} bg-opacity-10 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center py-16 gap-4`}>
                    <div className="w-20 h-20 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
                      <feat.placeholderIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <span className="text-base text-gray-400 font-medium italic">
                      {feat.placeholder}
                    </span>
                  </div>
                )}

                {/* Close button */}
                <div className="flex justify-center pt-2">
                  <Button
                    onClick={() => setOpenModal(null)}
                    className={`px-8 py-2 bg-gradient-to-r ${feat.gradient} text-white rounded-xl font-semibold hover:opacity-90 transition-opacity`}
                  >
                    {fr ? "Fermer" : "Close"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
