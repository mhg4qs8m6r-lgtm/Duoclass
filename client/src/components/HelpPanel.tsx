import { useState, useEffect } from "react";
import { X, BookOpen, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

// Contenu d'aide par page (facilement modifiable)
// Chaque clé correspond à un chemin de page ou un contexte
const helpContent: Record<string, { fr: HelpSection; en: HelpSection }> = {
  // Page Albums
  "/albums": {
    fr: {
      title: "Albums",
      description: "Gérez vos photos et documents organisés en albums.",
      sections: [
        {
          title: "Créer un album",
          content: "Cliquez sur '+ Créer catégorie/album' pour créer un nouvel album. Choisissez une catégorie et donnez un nom à votre album."
        },
        {
          title: "Importer des photos",
          content: "Sélectionnez un album puis cliquez sur 'Importer' dans la barre d'outils pour ajouter des photos depuis votre appareil."
        },
        {
          title: "Organiser",
          content: "Glissez-déposez les photos pour les réorganiser. Utilisez le zoom pour ajuster la taille des vignettes."
        },
        {
          title: "Sélection multiple",
          content: "Maintenez Ctrl (ou Cmd sur Mac) et cliquez pour sélectionner plusieurs photos. Utilisez Maj+clic pour sélectionner une plage."
        }
      ]
    },
    en: {
      title: "Albums",
      description: "Manage your photos and documents organized in albums.",
      sections: [
        {
          title: "Create an album",
          content: "Click '+ Create category/album' to create a new album. Choose a category and name your album."
        },
        {
          title: "Import photos",
          content: "Select an album then click 'Import' in the toolbar to add photos from your device."
        },
        {
          title: "Organize",
          content: "Drag and drop photos to reorganize them. Use the zoom to adjust thumbnail size."
        },
        {
          title: "Multiple selection",
          content: "Hold Ctrl (or Cmd on Mac) and click to select multiple photos. Use Shift+click to select a range."
        }
      ]
    }
  },

  // Page Albums Privés
  "/albums-prives": {
    fr: {
      title: "Albums Privés",
      description: "Vos albums privés sont stockés localement sur cet appareil (limite 500 Mo).",
      sections: [
        {
          title: "Stockage local",
          content: "Les albums privés sont stockés uniquement sur votre appareil. Ils ne sont pas synchronisés avec le cloud."
        },
        {
          title: "Limite de stockage",
          content: "Vous disposez de 500 Mo d'espace. L'indicateur en bas de page affiche l'espace utilisé."
        },
        {
          title: "Sauvegarde",
          content: "Pensez à sauvegarder régulièrement vos albums privés via les Utilitaires > Sauvegardes."
        }
      ]
    },
    en: {
      title: "Private Albums",
      description: "Your private albums are stored locally on this device (500 MB limit).",
      sections: [
        {
          title: "Local storage",
          content: "Private albums are stored only on your device. They are not synced with the cloud."
        },
        {
          title: "Storage limit",
          content: "You have 500 MB of space. The indicator at the bottom shows used space."
        },
        {
          title: "Backup",
          content: "Remember to regularly backup your private albums via Utilities > Backups."
        }
      ]
    }
  },

  // Page Paramètres
  "/parametres": {
    fr: {
      title: "Paramètres",
      description: "Configurez l'application selon vos préférences.",
      sections: [
        {
          title: "Général",
          content: "Modifiez le nom de l'application, l'avatar et les préférences générales."
        },
        {
          title: "Personnalisation",
          content: "Choisissez les couleurs et textures de l'interface. Personnalisez l'apparence de l'application."
        },
        {
          title: "Sécurité",
          content: "Définissez le Code Maître pour protéger les albums sécurisés et les paramètres sensibles."
        },
        {
          title: "Sauvegardes",
          content: "Configurez les sauvegardes automatiques vers OneDrive ou Google Drive."
        },
        {
          title: "Infos & Licence",
          content: "Consultez les informations de version et gérez votre licence d'utilisation."
        }
      ]
    },
    en: {
      title: "Settings",
      description: "Configure the application according to your preferences.",
      sections: [
        {
          title: "General",
          content: "Change the app name, avatar and general preferences."
        },
        {
          title: "Customization",
          content: "Choose interface colors and textures. Customize the app appearance."
        },
        {
          title: "Security",
          content: "Set the Master Code to protect secure albums and sensitive settings."
        },
        {
          title: "Backups",
          content: "Configure automatic backups to OneDrive or Google Drive."
        },
        {
          title: "Info & License",
          content: "View version information and manage your license."
        }
      ]
    }
  },

  // Page Thèmes Interface
  "/themes": {
    fr: {
      title: "Thèmes Interface",
      description: "Personnalisez l'apparence visuelle de l'application.",
      sections: [
        {
          title: "Couleurs",
          content: "Choisissez une couleur de fond parmi la palette proposée (couleurs de base ou pastels)."
        },
        {
          title: "Textures",
          content: "Appliquez une texture de fond : Bois, Marbre, Pierre, Tissus, Écossais, etc."
        },
        {
          title: "Zone de travail",
          content: "Personnalisez la couleur de fond de la zone centrale où s'affichent vos photos."
        },
        {
          title: "Texte",
          content: "Choisissez la couleur du texte : noir, blanc, gris ou bleu selon le contraste souhaité."
        }
      ]
    },
    en: {
      title: "Interface Themes",
      description: "Customize the visual appearance of the application.",
      sections: [
        {
          title: "Colors",
          content: "Choose a background color from the palette (basic or pastel colors)."
        },
        {
          title: "Textures",
          content: "Apply a background texture: Wood, Marble, Stone, Fabrics, Tartan, etc."
        },
        {
          title: "Work area",
          content: "Customize the background color of the central area where your photos are displayed."
        },
        {
          title: "Text",
          content: "Choose text color: black, white, gray or blue depending on desired contrast."
        }
      ]
    }
  },

  // Page Utilitaires / Aide
  "/utilitaires": {
    fr: {
      title: "Utilitaires",
      description: "Accédez aux outils et à la documentation de l'application.",
      sections: [
        {
          title: "Guide de démarrage",
          content: "Consultez le guide pour bien débuter avec DuoClass."
        },
        {
          title: "Aide détaillée",
          content: "Téléchargez le PDF récapitulatif complet de toutes les fonctionnalités."
        },
        {
          title: "Stockage Cloud",
          content: "Configurez la synchronisation avec OneDrive ou Google Drive."
        },
        {
          title: "FAQ",
          content: "Trouvez les réponses aux questions fréquemment posées."
        }
      ]
    },
    en: {
      title: "Utilities",
      description: "Access tools and application documentation.",
      sections: [
        {
          title: "Getting started",
          content: "Read the guide to get started with DuoClass."
        },
        {
          title: "Detailed help",
          content: "Download the complete PDF summary of all features."
        },
        {
          title: "Cloud storage",
          content: "Configure synchronization with OneDrive or Google Drive."
        },
        {
          title: "FAQ",
          content: "Find answers to frequently asked questions."
        }
      ]
    }
  },

  // PhotoClass (albums photos)
  "/photoclass": {
    fr: {
      title: "PhotoClass",
      description: "Gérez et retouchez vos photos dans cet album.",
      sections: [
        {
          title: "Navigation",
          content: "Utilisez les flèches ou le swipe pour naviguer entre les photos. Double-cliquez pour zoomer."
        },
        {
          title: "Retouches",
          content: "Cliquez sur 'Retouches Photos' pour accéder aux 12 outils de retouche : recadrage, filtres, ajustements..."
        },
        {
          title: "Créations",
          content: "Cliquez sur 'Créations' pour accéder au détourage, collage, effets artistiques et mise en page."
        },
        {
          title: "Partage",
          content: "Utilisez '@Mail' pour envoyer par email ou 'Imprimer' pour imprimer vos photos."
        },
        {
          title: "Diaporama",
          content: "Lancez un diaporama de vos photos avec transitions et musique de fond."
        }
      ]
    },
    en: {
      title: "PhotoClass",
      description: "Manage and edit your photos in this album.",
      sections: [
        {
          title: "Navigation",
          content: "Use arrows or swipe to navigate between photos. Double-click to zoom."
        },
        {
          title: "Editing",
          content: "Click 'Photo Editing' to access 12 editing tools: crop, filters, adjustments..."
        },
        {
          title: "Creations",
          content: "Click 'Creations' to access cutout, collage, artistic effects and layout."
        },
        {
          title: "Sharing",
          content: "Use '@Mail' to send by email or 'Print' to print your photos."
        },
        {
          title: "Slideshow",
          content: "Start a slideshow of your photos with transitions and background music."
        }
      ]
    }
  },

  // Retouches Photos
  "retouches": {
    fr: {
      title: "Retouches Photos",
      description: "12 outils de retouche pour améliorer vos photos.",
      sections: [
        {
          title: "Recadrer",
          content: "Ajustez le cadrage de votre photo avec des proportions libres ou prédéfinies."
        },
        {
          title: "Pivoter",
          content: "Faites pivoter votre photo de 90° ou ajustez l'angle finement."
        },
        {
          title: "Luminosité/Contraste",
          content: "Ajustez la luminosité et le contraste pour améliorer l'exposition."
        },
        {
          title: "Filtres",
          content: "Appliquez des filtres prédéfinis : Noir & Blanc, Sépia, Vintage..."
        },
        {
          title: "Supprimer arrière-plan",
          content: "Supprimez automatiquement l'arrière-plan grâce à l'IA (nécessite connexion)."
        }
      ]
    },
    en: {
      title: "Photo Editing",
      description: "12 editing tools to enhance your photos.",
      sections: [
        {
          title: "Crop",
          content: "Adjust your photo framing with free or preset proportions."
        },
        {
          title: "Rotate",
          content: "Rotate your photo by 90° or fine-tune the angle."
        },
        {
          title: "Brightness/Contrast",
          content: "Adjust brightness and contrast to improve exposure."
        },
        {
          title: "Filters",
          content: "Apply preset filters: Black & White, Sepia, Vintage..."
        },
        {
          title: "Remove background",
          content: "Automatically remove background using AI (requires connection)."
        }
      ]
    }
  },

  // Créations
  "creations": {
    fr: {
      title: "Créations",
      description: "Créez des compositions originales avec vos photos.",
      sections: [
        {
          title: "Détourage",
          content: "Découpez des éléments de vos photos avec le lasso, le point par point ou l'IA automatique."
        },
        {
          title: "Bibliothèque",
          content: "Accédez à vos détourages, cliparts, émotions, masques, cadres et arrière-plans."
        },
        {
          title: "Collage",
          content: "Composez une création en assemblant photos et éléments sur un canevas."
        },
        {
          title: "Effets artistiques",
          content: "Transformez vos photos avec des effets : BD, Peinture, Aquarelle, Crayon..."
        },
        {
          title: "Mise en page",
          content: "Créez des mises en page professionnelles avec templates, bordures et texte."
        }
      ]
    },
    en: {
      title: "Creations",
      description: "Create original compositions with your photos.",
      sections: [
        {
          title: "Cutout",
          content: "Cut out elements from your photos with lasso, point by point or automatic AI."
        },
        {
          title: "Library",
          content: "Access your cutouts, cliparts, emotions, masks, frames and backgrounds."
        },
        {
          title: "Collage",
          content: "Compose a creation by assembling photos and elements on a canvas."
        },
        {
          title: "Artistic effects",
          content: "Transform your photos with effects: Comics, Painting, Watercolor, Pencil..."
        },
        {
          title: "Layout",
          content: "Create professional layouts with templates, borders and text."
        }
      ]
    }
  },

  // Diaporama
  "diaporama": {
    fr: {
      title: "Diaporama",
      description: "Présentez vos photos en diaporama.",
      sections: [
        {
          title: "Lancer",
          content: "Cliquez sur 'Diaporama' dans la barre d'outils pour démarrer la présentation."
        },
        {
          title: "Transitions",
          content: "Choisissez parmi plusieurs effets de transition entre les photos."
        },
        {
          title: "Durée",
          content: "Réglez la durée d'affichage de chaque photo (3 à 10 secondes)."
        },
        {
          title: "Musique",
          content: "Ajoutez une musique de fond pour accompagner votre diaporama."
        },
        {
          title: "Contrôles",
          content: "Utilisez Espace pour pause/lecture, Échap pour quitter, flèches pour naviguer."
        }
      ]
    },
    en: {
      title: "Slideshow",
      description: "Present your photos as a slideshow.",
      sections: [
        {
          title: "Start",
          content: "Click 'Slideshow' in the toolbar to start the presentation."
        },
        {
          title: "Transitions",
          content: "Choose from several transition effects between photos."
        },
        {
          title: "Duration",
          content: "Set the display duration for each photo (3 to 10 seconds)."
        },
        {
          title: "Music",
          content: "Add background music to accompany your slideshow."
        },
        {
          title: "Controls",
          content: "Use Space for pause/play, Escape to exit, arrows to navigate."
        }
      ]
    }
  },

  // Page Atelier
  "/atelier": {
    fr: {
      title: "Atelier Créations",
      description: "Créez et personnalisez vos projets à partir de modèles.",
      sections: [
        {
          title: "Les modèles de la Bibliothèque",
          content: "La Bibliothèque propose des gabarits de référence (passe-partout, pêle-mêle, cadres, bordures). Ces modèles ne sont pas modifiables directement : ils servent de base pour créer vos propres projets."
        },
        {
          title: "Vos projets personnels",
          content: "Les projets que vous créez (visibles dans « Projets en cours ») sont entièrement modifiables. Vous pouvez les personnaliser, les sauvegarder et les exporter à tout moment."
        },
        {
          title: "Utiliser un modèle",
          content: "Cliquez sur « + Créer un nouveau projet », choisissez un type (passe-partout, pêle-mêle…), puis utilisez la Bibliothèque de modèles dans l'Atelier pour choisir un gabarit prêt à personnaliser."
        },
        {
          title: "Libérer de l'espace",
          content: "Si le stockage est plein, utilisez le bouton « Libérer l'espace » dans le bandeau pour supprimer les sauvegardes automatiques temporaires."
        }
      ]
    },
    en: {
      title: "Creations Workshop",
      description: "Create and customize your projects from templates.",
      sections: [
        {
          title: "Library templates",
          content: "The Library offers reference templates (mat boards, collages, frames, borders). These templates cannot be edited directly — they serve as a starting point for your own projects."
        },
        {
          title: "Your personal projects",
          content: "Projects you create (shown under \"Current projects\") are fully editable. You can customize, save and export them at any time."
        },
        {
          title: "Using a template",
          content: "Click \"+ Create a new project\", choose a type (mat board, collage…), then use the Template Library inside the Workshop to pick a ready-made design to customize."
        },
        {
          title: "Free up space",
          content: "If storage is full, use the \"Free up space\" button in the top bar to delete temporary auto-save data."
        }
      ]
    }
  },

  // Page par défaut
  "default": {
    fr: {
      title: "Aide",
      description: "Bienvenue dans l'aide de DuoClass.",
      sections: [
        {
          title: "Navigation",
          content: "Utilisez le menu latéral pour accéder aux différentes sections de l'application."
        },
        {
          title: "Aide contextuelle",
          content: "Cliquez sur le bouton vert à tout moment pour obtenir de l'aide sur la page actuelle."
        },
        {
          title: "Documentation complète",
          content: "Consultez les Utilitaires pour télécharger le guide complet en PDF."
        }
      ]
    },
    en: {
      title: "Help",
      description: "Welcome to DuoClass help.",
      sections: [
        {
          title: "Navigation",
          content: "Use the sidebar menu to access different sections of the application."
        },
        {
          title: "Contextual help",
          content: "Click the green button anytime to get help on the current page."
        },
        {
          title: "Full documentation",
          content: "Check Utilities to download the complete PDF guide."
        }
      ]
    }
  }
};

interface HelpSection {
  title: string;
  description: string;
  sections: {
    title: string;
    content: string;
  }[];
}

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  context?: string; // Contexte supplémentaire (ex: "retouches", "creations")
}

export default function HelpPanel({ isOpen, onClose, currentPath, context }: HelpPanelProps) {
  const { language } = useLanguage();
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  // Déterminer le contenu d'aide à afficher
  const getHelpContent = (): HelpSection => {
    // Priorité au contexte si fourni
    if (context && helpContent[context]) {
      return helpContent[context][language as 'fr' | 'en'] || helpContent[context].fr;
    }
    
    // Sinon, chercher par chemin
    // Gérer les chemins dynamiques comme /photoclass/123
    let path = currentPath;
    if (path.startsWith('/photoclass/')) {
      path = '/photoclass';
    }
    
    if (helpContent[path]) {
      return helpContent[path][language as 'fr' | 'en'] || helpContent[path].fr;
    }
    
    // Contenu par défaut
    return helpContent.default[language as 'fr' | 'en'] || helpContent.default.fr;
  };

  const content = getHelpContent();

  // Fermer avec Échap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className={cn(
          "fixed right-0 top-0 h-full w-[380px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-50 to-green-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#90EE90] rounded-full flex items-center justify-center shadow-sm">
              <span className="text-xl">👍</span>
            </div>
            <div>
              <h2 className="font-bold text-gray-800">{content.title}</h2>
              <p className="text-xs text-gray-500">{language === 'fr' ? 'Aide contextuelle' : 'Contextual help'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Description */}
        <div className="p-4 bg-blue-50 border-b">
          <p className="text-sm text-blue-800">{content.description}</p>
        </div>

        {/* Sections */}
        <div className="overflow-y-auto h-[calc(100%-180px)] p-4 space-y-2">
          {content.sections.map((section, index) => (
            <div 
              key={index}
              className="border rounded-lg overflow-hidden bg-white shadow-sm"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === index ? null : index)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-700">{section.title}</span>
                </div>
                <ChevronRight 
                  className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    expandedSection === index && "rotate-90"
                  )}
                />
              </button>
              {expandedSection === index && (
                <div className="px-4 pb-4 pt-1 bg-gray-50 border-t">
                  <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 border-t">
          <p className="text-xs text-gray-500 text-center">
            {language === 'fr' 
              ? 'Appuyez sur Échap ou cliquez à l\'extérieur pour fermer'
              : 'Press Escape or click outside to close'
            }
          </p>
        </div>
      </div>
    </>
  );
}
