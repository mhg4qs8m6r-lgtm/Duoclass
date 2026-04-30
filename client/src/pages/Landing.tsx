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

import screenshotAlbums from "@/assets/Albums_et_catégories .png";
import screenshotRetoucheMagique from "@/assets/retouche_magique.png";
import screenshotRetoucheManuelle from "@/assets/retouche_manuelle.png";
import screenshotRetouchesAvancees from "@/assets/retouches_avancées.png";
import screenshotAtelier from "@/assets/Atelier_créatif.png";
import screenshotImport from "@/assets/Import_et_partage.png";
import screenshotPrives from "@/assets/Albums_privés.png";
import screenshotParental from "@/assets/Controle_parental.png";
import screenshotDoublons from "@/assets/Doublons.png";

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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const featureModals = [
    {
      emoji: "📷",
      title: fr ? "Albums & Catégories" : "Albums & Categories",
      icon: Camera,
      gradient: "from-cyan-400 to-blue-500",
      description: fr
        ? "DuoClass vous permet de créer autant d'albums et de catégories que vous le souhaitez. Créez et organisez vos photos, vidéos familiales et documents exactement comme vous en avez envie. Utilisez des catégories par thème — Famille, Voyages, Travail... — puis organisez vos albums à l'intérieur. Vos albums privés sont protégés par un mot de passe, vous permettant de conserver des souvenirs en toute discrétion. Triez, retouchez, imprimez, envoyez par @Mail, convertissez vos formats... toutes ces fonctions sont à votre disposition !"
        : "DuoClass lets you create as many albums and categories as you want. Create and organize your photos, family videos and documents exactly the way you like. Use themed categories — Family, Travel, Work... — then organize your albums within them. Your private albums are password-protected, letting you keep memories in complete privacy. Sort, retouch, print, send by email, convert formats... all these features are at your fingertips!",
      placeholder: fr ? "Vidéo de démonstration à venir" : "Demo video coming soon",
      placeholderIcon: Play,
      screenshots: [screenshotAlbums],
    },
    {
      emoji: "✨",
      title: fr ? "Retouche & Effets" : "Retouch & Effects",
      icon: Sparkles,
      gradient: "from-pink-400 to-purple-500",
      description: fr
        ? "DuoClass met à votre disposition un ensemble d'outils de retouche pour magnifier vos photos sans quitter l'application. Vous disposez de 3 niveaux de retouche : retouche magique, manuelle et avancée pour modifier, améliorer et sublimer vos photos. Ajustez la luminosité, le contraste, la saturation et la netteté en quelques glissements. Appliquez des effets artistiques pour donner une atmosphère unique à vos images. Recadrez, faites pivoter, corrigez les yeux rouges — toutes les retouches essentielles sont là, simples et intuitives. Vos photos originales sont toujours préservées — vous pouvez revenir en arrière à tout moment."
        : "DuoClass provides a full set of retouching tools to enhance your photos without leaving the app. You get 3 levels of retouching: magic, manual and advanced to edit, improve and transform your photos. Adjust brightness, contrast, saturation and sharpness with a few swipes. Apply artistic effects to give your images a unique atmosphere. Crop, rotate, fix red eyes — all essential retouching tools are there, simple and intuitive. Your original photos are always preserved — you can revert at any time.",
      placeholder: fr ? "Photo de démonstration à venir" : "Demo photo coming soon",
      placeholderIcon: ImageLucide,
      screenshots: [screenshotRetoucheMagique, screenshotRetoucheManuelle, screenshotRetouchesAvancees],
    },
    {
      emoji: "🎨",
      title: fr ? "Atelier Créatif" : "Creative Workshop",
      icon: Scissors,
      gradient: "from-orange-400 to-red-500",
      description: fr
        ? "L'Atelier Créatif de DuoClass vous ouvre un espace de création unique pour donner vie à vos plus beaux souvenirs et plus encore... à votre imagination ! Créez des collages, montages, pêle-mêles, passe-partout, pages de stickers et même des puzzles — tout est possible avec vos propres photos ou des images. Chaque projet est sauvegardé automatiquement. Reprenez votre création à tout moment, ajoutez des images depuis vos albums, retouchez, ajoutez du texte et des effets typographiques. Une fois satisfait, téléchargez, imprimez ou partagez votre création directement depuis l'Atelier."
        : "The DuoClass Creative Workshop opens a unique creative space to bring your most beautiful memories to life and more... your imagination! Create collages, montages, photo mixes, matting, sticker pages and even puzzles — anything is possible with your own photos or images. Each project is saved automatically. Resume your creation at any time, add images from your albums, retouch, add text and typographic effects. Once satisfied, download, print or share your creation directly from the Workshop.",
      placeholder: fr ? "Photo de démonstration à venir" : "Demo photo coming soon",
      placeholderIcon: ImageLucide,
      screenshots: [screenshotAtelier],
    },
    {
      emoji: "📤",
      title: fr ? "Import & Partage" : "Import & Share",
      icon: Send,
      gradient: "from-emerald-400 to-teal-500",
      description: fr
        ? "DuoClass vous permet d'importer facilement vos photos et documents depuis votre appareil, sa carte SD ou votre ordinateur. Faites des selfies directement à partir de la caméra de votre PC ou portable ! Importez en quelques clics depuis votre Mac ou PC. DuoClass accepte tous les formats courants — JPEG, PNG, HEIC, PDF, vidéos et bien d'autres. Partagez vos albums et créations avec votre famille et vos proches en un clic — par @Mail directement depuis l'application. Convertissez vos formats, imprimez, téléchargez — tout ce dont vous avez besoin pour partager vos souvenirs est réuni au même endroit."
        : "DuoClass lets you easily import your photos and documents from your device, its SD card or your computer. Take selfies directly from your PC or laptop camera! Import in a few clicks from your Mac or PC. DuoClass accepts all common formats — JPEG, PNG, HEIC, PDF, videos and many more. Share your albums and creations with family and loved ones in one click — by email directly from the app. Convert formats, print, download — everything you need to share your memories is gathered in one place.",
      placeholder: null,
      placeholderIcon: null,
      screenshots: [screenshotImport],
    },
    {
      emoji: "🔒",
      title: fr ? "Albums Privés" : "Private Albums",
      icon: Shield,
      gradient: "from-purple-400 to-indigo-500",
      description: fr
        ? "DuoClass vous offre la possibilité de protéger vos photos et documents personnels, privés, dans des albums accessibles uniquement par vous. Chaque album privé est protégé par un mot de passe de votre choix. Vos souvenirs restent à l'abri des regards indiscrets, en toute sérénité. Créez autant d'albums privés que vous le souhaitez — photos de famille, documents personnels, contrats, documents juridiques, souvenirs intimes — tout ce que vous souhaitez garder rien que pour vous."
        : "DuoClass lets you protect your personal, private photos and documents in albums accessible only by you. Each private album is protected by a password of your choice. Your memories stay safe from prying eyes, in complete peace of mind. Create as many private albums as you wish — family photos, personal documents, contracts, legal documents, intimate memories — everything you want to keep just for yourself.",
      placeholder: fr ? "Photo de démonstration à venir" : "Demo photo coming soon",
      placeholderIcon: ImageLucide,
      screenshots: [screenshotPrives],
    },
    {
      emoji: "🛡️",
      title: fr ? "Contrôle Parental & Détection des Doublons" : "Parental Control & Duplicate Detection",
      icon: ShieldCheck,
      gradient: "from-violet-500 to-purple-600",
      description: fr
        ? "DuoClass intègre un contrôle parental pour protéger les plus jeunes. Grâce à un curseur de progression, définissez le niveau d'accès global aux contenus sensibles sur l'appareil. Une application familiale en toute sécurité. Avec le temps, les photos en double s'accumulent et occupent inutilement de l'espace. DuoClass détecte automatiquement vos photos en double et vous propose en un clic de les supprimer, de les conserver en cas de retouches, ou de faire votre choix ultérieurement. Libérez de l'espace, gardez vos albums propres et bien organisés — sans effort !"
        : "DuoClass includes parental controls to protect younger users. With a progress slider, set the overall access level to sensitive content on the device. A family app in complete safety. Over time, duplicate photos pile up and waste space. DuoClass automatically detects your duplicate photos and lets you delete them in one click, keep them in case of retouching, or decide later. Free up space, keep your albums clean and well organized — effortlessly!",
      placeholder: fr ? "Photo de démonstration à venir" : "Demo photo coming soon",
      placeholderIcon: ImageLucide,
      screenshots: [screenshotParental, screenshotDoublons],
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
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 shadow-md shadow-orange-200"
              onClick={() => setLocation("/albums")}
            >
              {fr ? "Ouvrir DuoClass" : "Open DuoClass"}
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
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] overflow-y-auto"
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

                {/* Screenshots */}
                {feat.screenshots && feat.screenshots.length > 0 && (
                  <div className={`flex gap-3 justify-center ${feat.screenshots.length === 1 ? "flex-col items-center" : ""}`}>
                    {feat.screenshots.map((src: string, idx: number) => (
                      <img
                        key={idx}
                        src={src}
                        alt={`${feat.title} ${idx + 1}`}
                        className="rounded-xl shadow-lg border border-gray-200 object-contain cursor-zoom-in hover:opacity-80 transition-opacity"
                        style={{
                          maxHeight: feat.screenshots!.length === 1 ? "400px" : "280px",
                          maxWidth: feat.screenshots!.length === 1 ? "100%" : `${Math.floor(100 / feat.screenshots!.length) - 2}%`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxSrc(src);
                        }}
                      />
                    ))}
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

      {/* ───── Lightbox ───── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Zoom"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
