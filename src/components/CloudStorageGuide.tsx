import { useState, useEffect } from "react";
import { Cloud, Monitor, Apple, Terminal, ChevronDown, ChevronRight, ExternalLink, CheckCircle2, AlertCircle, Info, Shield, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { db } from "@/db";

type Platform = "mac" | "windows" | "linux";
type CloudService = "onedrive" | "googledrive";

// Clés de stockage pour les préférences cloud
const CLOUD_SERVICE_KEY = "cloud_preferred_service";
const CLOUD_PLATFORM_KEY = "cloud_preferred_platform";

interface CloudStorageGuideProps {
  language: "fr" | "en";
}

export default function CloudStorageGuide({ language }: CloudStorageGuideProps) {
  const [selectedService, setSelectedService] = useState<CloudService>("googledrive");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("mac");
  const [expandedSections, setExpandedSections] = useState<string[]>(["prerequisites"]);
  const [isSaved, setIsSaved] = useState(false);

  // Charger les préférences sauvegardées au montage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedService = await db.settings.get(CLOUD_SERVICE_KEY);
        const savedPlatform = await db.settings.get(CLOUD_PLATFORM_KEY);
        
        if (savedService?.value) {
          setSelectedService(savedService.value as CloudService);
        }
        if (savedPlatform?.value) {
          setSelectedPlatform(savedPlatform.value as Platform);
        }
        
        // Marquer comme sauvegardé si des préférences existent
        if (savedService?.value || savedPlatform?.value) {
          setIsSaved(true);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des préférences cloud:", error);
      }
    };
    loadPreferences();
  }, []);

  // Sauvegarder les préférences
  const savePreferences = async () => {
    try {
      await db.settings.put({ key: CLOUD_SERVICE_KEY, value: selectedService });
      await db.settings.put({ key: CLOUD_PLATFORM_KEY, value: selectedPlatform });
      setIsSaved(true);
      
      const message = language === "fr" 
        ? "Votre choix a été mémorisé dans les paramètres"
        : "Your choice has been saved in settings";
      toast.success(message);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des préférences:", error);
      const errorMessage = language === "fr"
        ? "Erreur lors de la sauvegarde"
        : "Error saving preferences";
      toast.error(errorMessage);
    }
  };

  // Réinitialiser l'état de sauvegarde quand les sélections changent
  const handleServiceChange = (service: CloudService) => {
    setSelectedService(service);
    setIsSaved(false);
  };

  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatform(platform);
    setIsSaved(false);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const t = {
    fr: {
      title: "Configuration du stockage cloud",
      subtitle: "Synchronisez vos photos avec OneDrive ou Google Drive",
      selectService: "Choisissez votre service cloud",
      selectPlatform: "Choisissez votre système",
      
      // Google Drive
      googleDrive: {
        name: "Google Drive",
        description: "15 Go gratuits, intégré avec Gmail",
        
        // Prérequis
        prerequisites: {
          title: "Prérequis",
          items: [
            "Un compte Google (Gmail)",
            "Une connexion Internet",
            "Environ 10 minutes de temps"
          ]
        },
        
        // Mac
        mac: {
          steps: [
            {
              title: "Télécharger Google Drive pour Mac",
              content: "Rendez-vous sur drive.google.com/download et cliquez sur \"Télécharger Drive pour ordinateur\". Le fichier GoogleDrive.dmg sera téléchargé."
            },
            {
              title: "Installer l'application",
              content: "Double-cliquez sur le fichier GoogleDrive.dmg téléchargé. Glissez l'icône Google Drive vers le dossier Applications."
            },
            {
              title: "Lancer Google Drive",
              content: "Ouvrez le dossier Applications et double-cliquez sur Google Drive. L'icône apparaîtra dans la barre de menu en haut à droite."
            },
            {
              title: "Se connecter",
              content: "Cliquez sur l'icône Google Drive dans la barre de menu, puis sur \"Se connecter\". Entrez votre adresse Gmail et votre mot de passe."
            },
            {
              title: "Configurer la synchronisation",
              content: "Choisissez \"Synchroniser mon Drive sur cet ordinateur\". Un dossier \"Google Drive\" apparaîtra dans le Finder, dans la barre latérale."
            },
            {
              title: "Utiliser avec DuoClass",
              content: "Dans DuoClass, lors de l'import ou l'export, naviguez vers le dossier Google Drive dans le Finder. Vos fichiers seront automatiquement synchronisés avec le cloud."
            }
          ],
          tips: [
            "Le dossier Google Drive se trouve dans votre dossier personnel (/Users/VotreNom/Google Drive)",
            "L'icône dans la barre de menu indique l'état de synchronisation (nuage avec coche = synchronisé)",
            "Vous pouvez créer un sous-dossier \"DuoClass\" dans Google Drive pour organiser vos sauvegardes"
          ]
        },
        
        // Windows
        windows: {
          steps: [
            {
              title: "Télécharger Google Drive pour Windows",
              content: "Rendez-vous sur drive.google.com/download et cliquez sur \"Télécharger Drive pour ordinateur\". Le fichier GoogleDriveSetup.exe sera téléchargé."
            },
            {
              title: "Installer l'application",
              content: "Double-cliquez sur GoogleDriveSetup.exe. Si Windows demande l'autorisation, cliquez sur \"Oui\". L'installation se fait automatiquement."
            },
            {
              title: "Se connecter",
              content: "Google Drive se lance automatiquement après l'installation. Cliquez sur \"Se connecter avec le navigateur\" et entrez vos identifiants Gmail."
            },
            {
              title: "Configurer la synchronisation",
              content: "Choisissez \"Synchroniser mon Drive sur cet ordinateur\". Un nouveau lecteur \"Google Drive (G:)\" apparaîtra dans l'Explorateur de fichiers."
            },
            {
              title: "Accéder à Google Drive",
              content: "Ouvrez l'Explorateur de fichiers (icône dossier jaune). Dans la barre latérale gauche, vous verrez \"Google Drive\". Cliquez dessus pour accéder à vos fichiers."
            },
            {
              title: "Utiliser avec DuoClass",
              content: "Dans DuoClass, lors de l'import ou l'export, naviguez vers le lecteur Google Drive (G:). Vos fichiers seront automatiquement synchronisés."
            }
          ],
          tips: [
            "L'icône Google Drive apparaît dans la zone de notification (en bas à droite, près de l'horloge)",
            "Clic droit sur l'icône pour voir l'état de synchronisation",
            "Créez un dossier \"DuoClass\" dans Google Drive pour organiser vos sauvegardes"
          ]
        },
        
        // Linux
        linux: {
          steps: [
            {
              title: "Option 1 : Utiliser le navigateur web",
              content: "La méthode la plus simple sur Linux est d'utiliser drive.google.com dans votre navigateur. Connectez-vous avec votre compte Google pour accéder à vos fichiers."
            },
            {
              title: "Option 2 : Installer GNOME Online Accounts (Ubuntu/Fedora)",
              content: "Ouvrez Paramètres → Comptes en ligne → Google. Connectez-vous avec votre compte Google. Vos fichiers Drive seront accessibles dans le gestionnaire de fichiers."
            },
            {
              title: "Option 3 : Utiliser rclone (avancé)",
              content: "Installez rclone avec 'sudo apt install rclone' (Ubuntu) ou 'sudo dnf install rclone' (Fedora). Configurez avec 'rclone config' et suivez les instructions pour Google Drive."
            },
            {
              title: "Monter Google Drive avec rclone",
              content: "Créez un dossier : 'mkdir ~/GoogleDrive'. Montez avec : 'rclone mount gdrive: ~/GoogleDrive --vfs-cache-mode full'. Vos fichiers sont maintenant accessibles."
            },
            {
              title: "Utiliser avec DuoClass",
              content: "Avec GNOME Online Accounts, accédez à vos fichiers via le gestionnaire de fichiers. Avec rclone, utilisez le dossier ~/GoogleDrive."
            }
          ],
          tips: [
            "GNOME Online Accounts est la solution la plus simple pour Ubuntu et Fedora",
            "rclone offre plus de contrôle mais nécessite la ligne de commande",
            "Pour KDE Plasma, utilisez kio-gdrive depuis votre gestionnaire de paquets"
          ]
        }
      },
      
      // OneDrive
      oneDrive: {
        name: "OneDrive",
        description: "5 Go gratuits, intégré avec Microsoft 365",
        
        prerequisites: {
          title: "Prérequis",
          items: [
            "Un compte Microsoft (Outlook, Hotmail, ou compte Microsoft 365)",
            "Une connexion Internet",
            "Environ 10 minutes de temps"
          ]
        },
        
        // Mac
        mac: {
          steps: [
            {
              title: "Télécharger OneDrive pour Mac",
              content: "Ouvrez l'App Store sur votre Mac (icône bleue avec un A). Recherchez \"OneDrive\" et cliquez sur \"Obtenir\" puis \"Installer\"."
            },
            {
              title: "Lancer OneDrive",
              content: "Une fois installé, ouvrez OneDrive depuis le dossier Applications ou le Launchpad. L'icône nuage apparaîtra dans la barre de menu."
            },
            {
              title: "Se connecter",
              content: "Entrez votre adresse email Microsoft (Outlook, Hotmail, ou compte professionnel). Cliquez sur \"Se connecter\" et entrez votre mot de passe."
            },
            {
              title: "Choisir l'emplacement du dossier",
              content: "OneDrive vous propose un emplacement pour le dossier de synchronisation. Gardez l'emplacement par défaut ou choisissez-en un autre."
            },
            {
              title: "Configurer la synchronisation",
              content: "Choisissez les dossiers à synchroniser. Pour commencer, sélectionnez \"Synchroniser tous les fichiers et dossiers\"."
            },
            {
              title: "Utiliser avec DuoClass",
              content: "Le dossier OneDrive apparaît dans le Finder. Dans DuoClass, naviguez vers ce dossier pour sauvegarder ou récupérer vos fichiers."
            }
          ],
          tips: [
            "Le dossier OneDrive se trouve généralement dans /Users/VotreNom/OneDrive",
            "L'icône nuage dans la barre de menu montre l'état de synchronisation",
            "Les fichiers avec une coche verte sont synchronisés, ceux avec un nuage sont uniquement en ligne"
          ]
        },
        
        // Windows
        windows: {
          steps: [
            {
              title: "OneDrive est déjà installé",
              content: "Bonne nouvelle ! OneDrive est préinstallé sur Windows 10 et 11. Cherchez \"OneDrive\" dans le menu Démarrer et cliquez dessus."
            },
            {
              title: "Se connecter",
              content: "Si ce n'est pas déjà fait, entrez votre adresse email Microsoft. Cliquez sur \"Se connecter\" et entrez votre mot de passe."
            },
            {
              title: "Configurer le dossier OneDrive",
              content: "Choisissez l'emplacement du dossier OneDrive (par défaut : C:\\Users\\VotreNom\\OneDrive). Cliquez sur \"Suivant\"."
            },
            {
              title: "Choisir les dossiers à synchroniser",
              content: "Sélectionnez \"Synchroniser tous les fichiers et dossiers\" pour avoir accès à tout, ou choisissez des dossiers spécifiques."
            },
            {
              title: "Accéder à OneDrive",
              content: "Ouvrez l'Explorateur de fichiers. OneDrive apparaît dans la barre latérale gauche avec une icône de nuage bleu."
            },
            {
              title: "Utiliser avec DuoClass",
              content: "Dans DuoClass, lors de l'import ou l'export, naviguez vers le dossier OneDrive. Vos fichiers seront automatiquement synchronisés avec le cloud."
            }
          ],
          tips: [
            "L'icône OneDrive (nuage bleu) se trouve dans la zone de notification près de l'horloge",
            "Clic droit sur un fichier dans OneDrive → \"Toujours conserver sur cet appareil\" pour le garder hors ligne",
            "Les fichiers avec un nuage bleu sont uniquement en ligne (économise de l'espace)"
          ]
        },
        
        // Linux
        linux: {
          steps: [
            {
              title: "Option 1 : Utiliser le navigateur web",
              content: "Microsoft ne propose pas de client OneDrive officiel pour Linux. La méthode la plus simple est d'utiliser onedrive.live.com dans votre navigateur."
            },
            {
              title: "Option 2 : Installer onedrive-client (Ubuntu)",
              content: "Ajoutez le PPA : 'sudo add-apt-repository ppa:yann1ck/onedrive'. Puis installez : 'sudo apt update && sudo apt install onedrive'."
            },
            {
              title: "Configurer onedrive-client",
              content: "Lancez 'onedrive' dans le terminal. Un lien d'autorisation s'affiche. Copiez-le dans votre navigateur, connectez-vous, et copiez l'URL de redirection."
            },
            {
              title: "Synchroniser vos fichiers",
              content: "Lancez 'onedrive --synchronize' pour une synchronisation unique, ou 'onedrive --monitor' pour une synchronisation continue en arrière-plan."
            },
            {
              title: "Option 3 : Utiliser rclone",
              content: "Installez rclone et configurez-le pour OneDrive avec 'rclone config'. Montez ensuite avec 'rclone mount onedrive: ~/OneDrive'."
            },
            {
              title: "Utiliser avec DuoClass",
              content: "Avec onedrive-client, vos fichiers sont dans ~/OneDrive. Avec rclone, utilisez le point de montage que vous avez choisi."
            }
          ],
          tips: [
            "onedrive-client est un projet open-source maintenu par la communauté",
            "Pour une synchronisation automatique au démarrage, créez un service systemd",
            "rclone est plus universel mais nécessite plus de configuration"
          ]
        }
      },
      
      troubleshooting: {
        title: "Problèmes courants",
        items: [
          {
            problem: "La synchronisation ne démarre pas",
            solution: "Vérifiez votre connexion Internet. Redémarrez l'application cloud. Déconnectez-vous puis reconnectez-vous."
          },
          {
            problem: "Espace de stockage insuffisant",
            solution: "Google Drive offre 15 Go gratuits, OneDrive 5 Go. Supprimez les fichiers inutiles ou passez à un forfait payant."
          },
          {
            problem: "Les fichiers ne se synchronisent pas",
            solution: "Vérifiez que le fichier n'est pas ouvert dans une autre application. Les noms de fichiers avec caractères spéciaux peuvent poser problème."
          }
        ]
      },
      
      securityTips: {
        title: "Conseils de sécurité",
        items: [
          "Activez l'authentification à deux facteurs sur votre compte cloud",
          "Ne partagez jamais vos identifiants de connexion",
          "Vérifiez régulièrement les appareils connectés à votre compte",
          "Utilisez un mot de passe fort et unique"
        ]
      }
    },
    
    // English translations
    en: {
      title: "Cloud Storage Setup",
      subtitle: "Sync your photos with OneDrive or Google Drive",
      selectService: "Choose your cloud service",
      selectPlatform: "Choose your system",
      
      googleDrive: {
        name: "Google Drive",
        description: "15 GB free, integrated with Gmail",
        
        prerequisites: {
          title: "Prerequisites",
          items: [
            "A Google account (Gmail)",
            "An Internet connection",
            "About 10 minutes of time"
          ]
        },
        
        mac: {
          steps: [
            {
              title: "Download Google Drive for Mac",
              content: "Go to drive.google.com/download and click \"Download Drive for desktop\". The GoogleDrive.dmg file will be downloaded."
            },
            {
              title: "Install the application",
              content: "Double-click the downloaded GoogleDrive.dmg file. Drag the Google Drive icon to the Applications folder."
            },
            {
              title: "Launch Google Drive",
              content: "Open the Applications folder and double-click Google Drive. The icon will appear in the menu bar at the top right."
            },
            {
              title: "Sign in",
              content: "Click the Google Drive icon in the menu bar, then \"Sign in\". Enter your Gmail address and password."
            },
            {
              title: "Configure sync",
              content: "Choose \"Sync my Drive to this computer\". A \"Google Drive\" folder will appear in Finder, in the sidebar."
            },
            {
              title: "Use with DuoClass",
              content: "In DuoClass, when importing or exporting, navigate to the Google Drive folder in Finder. Your files will be automatically synced to the cloud."
            }
          ],
          tips: [
            "The Google Drive folder is located in your home folder (/Users/YourName/Google Drive)",
            "The icon in the menu bar shows sync status (cloud with checkmark = synced)",
            "You can create a \"DuoClass\" subfolder in Google Drive to organize your backups"
          ]
        },
        
        windows: {
          steps: [
            {
              title: "Download Google Drive for Windows",
              content: "Go to drive.google.com/download and click \"Download Drive for desktop\". The GoogleDriveSetup.exe file will be downloaded."
            },
            {
              title: "Install the application",
              content: "Double-click GoogleDriveSetup.exe. If Windows asks for permission, click \"Yes\". Installation is automatic."
            },
            {
              title: "Sign in",
              content: "Google Drive launches automatically after installation. Click \"Sign in with browser\" and enter your Gmail credentials."
            },
            {
              title: "Configure sync",
              content: "Choose \"Sync my Drive to this computer\". A new \"Google Drive (G:)\" drive will appear in File Explorer."
            },
            {
              title: "Access Google Drive",
              content: "Open File Explorer (yellow folder icon). In the left sidebar, you'll see \"Google Drive\". Click it to access your files."
            },
            {
              title: "Use with DuoClass",
              content: "In DuoClass, when importing or exporting, navigate to the Google Drive drive (G:). Your files will be automatically synced."
            }
          ],
          tips: [
            "The Google Drive icon appears in the notification area (bottom right, near the clock)",
            "Right-click the icon to see sync status",
            "Create a \"DuoClass\" folder in Google Drive to organize your backups"
          ]
        },
        
        linux: {
          steps: [
            {
              title: "Option 1: Use the web browser",
              content: "The simplest method on Linux is to use drive.google.com in your browser. Sign in with your Google account to access your files."
            },
            {
              title: "Option 2: Install GNOME Online Accounts (Ubuntu/Fedora)",
              content: "Open Settings → Online Accounts → Google. Sign in with your Google account. Your Drive files will be accessible in the file manager."
            },
            {
              title: "Option 3: Use rclone (advanced)",
              content: "Install rclone with 'sudo apt install rclone' (Ubuntu) or 'sudo dnf install rclone' (Fedora). Configure with 'rclone config' and follow the instructions for Google Drive."
            },
            {
              title: "Mount Google Drive with rclone",
              content: "Create a folder: 'mkdir ~/GoogleDrive'. Mount with: 'rclone mount gdrive: ~/GoogleDrive --vfs-cache-mode full'. Your files are now accessible."
            },
            {
              title: "Use with DuoClass",
              content: "With GNOME Online Accounts, access your files via the file manager. With rclone, use the ~/GoogleDrive folder."
            }
          ],
          tips: [
            "GNOME Online Accounts is the simplest solution for Ubuntu and Fedora",
            "rclone offers more control but requires command line",
            "For KDE Plasma, use kio-gdrive from your package manager"
          ]
        }
      },
      
      oneDrive: {
        name: "OneDrive",
        description: "5 GB free, integrated with Microsoft 365",
        
        prerequisites: {
          title: "Prerequisites",
          items: [
            "A Microsoft account (Outlook, Hotmail, or Microsoft 365 account)",
            "An Internet connection",
            "About 10 minutes of time"
          ]
        },
        
        mac: {
          steps: [
            {
              title: "Download OneDrive for Mac",
              content: "Open the App Store on your Mac (blue icon with an A). Search for \"OneDrive\" and click \"Get\" then \"Install\"."
            },
            {
              title: "Launch OneDrive",
              content: "Once installed, open OneDrive from the Applications folder or Launchpad. The cloud icon will appear in the menu bar."
            },
            {
              title: "Sign in",
              content: "Enter your Microsoft email address (Outlook, Hotmail, or work account). Click \"Sign in\" and enter your password."
            },
            {
              title: "Choose folder location",
              content: "OneDrive will suggest a location for the sync folder. Keep the default location or choose another."
            },
            {
              title: "Configure sync",
              content: "Choose which folders to sync. To start, select \"Sync all files and folders\"."
            },
            {
              title: "Use with DuoClass",
              content: "The OneDrive folder appears in Finder. In DuoClass, navigate to this folder to save or retrieve your files."
            }
          ],
          tips: [
            "The OneDrive folder is usually located at /Users/YourName/OneDrive",
            "The cloud icon in the menu bar shows sync status",
            "Files with a green checkmark are synced, those with a cloud are online-only"
          ]
        },
        
        windows: {
          steps: [
            {
              title: "OneDrive is already installed",
              content: "Good news! OneDrive is pre-installed on Windows 10 and 11. Search for \"OneDrive\" in the Start menu and click it."
            },
            {
              title: "Sign in",
              content: "If not already done, enter your Microsoft email address. Click \"Sign in\" and enter your password."
            },
            {
              title: "Configure the OneDrive folder",
              content: "Choose the OneDrive folder location (default: C:\\Users\\YourName\\OneDrive). Click \"Next\"."
            },
            {
              title: "Choose folders to sync",
              content: "Select \"Sync all files and folders\" to have access to everything, or choose specific folders."
            },
            {
              title: "Access OneDrive",
              content: "Open File Explorer. OneDrive appears in the left sidebar with a blue cloud icon."
            },
            {
              title: "Use with DuoClass",
              content: "In DuoClass, when importing or exporting, navigate to the OneDrive folder. Your files will be automatically synced to the cloud."
            }
          ],
          tips: [
            "The OneDrive icon (blue cloud) is in the notification area near the clock",
            "Right-click a file in OneDrive → \"Always keep on this device\" to keep it offline",
            "Files with a blue cloud are online-only (saves space)"
          ]
        },
        
        linux: {
          steps: [
            {
              title: "Option 1: Use the web browser",
              content: "Microsoft doesn't offer an official OneDrive client for Linux. The simplest method is to use onedrive.live.com in your browser."
            },
            {
              title: "Option 2: Install onedrive-client (Ubuntu)",
              content: "Add the PPA: 'sudo add-apt-repository ppa:yann1ck/onedrive'. Then install: 'sudo apt update && sudo apt install onedrive'."
            },
            {
              title: "Configure onedrive-client",
              content: "Run 'onedrive' in the terminal. An authorization link appears. Copy it to your browser, sign in, and copy the redirect URL."
            },
            {
              title: "Sync your files",
              content: "Run 'onedrive --synchronize' for a one-time sync, or 'onedrive --monitor' for continuous background sync."
            },
            {
              title: "Option 3: Use rclone",
              content: "Install rclone and configure it for OneDrive with 'rclone config'. Then mount with 'rclone mount onedrive: ~/OneDrive'."
            },
            {
              title: "Use with DuoClass",
              content: "With onedrive-client, your files are in ~/OneDrive. With rclone, use the mount point you chose."
            }
          ],
          tips: [
            "onedrive-client is a community-maintained open-source project",
            "For automatic sync at startup, create a systemd service",
            "rclone is more universal but requires more configuration"
          ]
        }
      },
      
      troubleshooting: {
        title: "Common Problems",
        items: [
          {
            problem: "Sync doesn't start",
            solution: "Check your Internet connection. Restart the cloud app. Sign out and sign back in."
          },
          {
            problem: "Insufficient storage space",
            solution: "Google Drive offers 15 GB free, OneDrive 5 GB. Delete unnecessary files or upgrade to a paid plan."
          },
          {
            problem: "Files don't sync",
            solution: "Make sure the file isn't open in another application. File names with special characters can cause issues."
          }
        ]
      },
      
      securityTips: {
        title: "Security Tips",
        items: [
          "Enable two-factor authentication on your cloud account",
          "Never share your login credentials",
          "Regularly check devices connected to your account",
          "Use a strong and unique password"
        ]
      }
    }
  };

  const content = language === "fr" ? t.fr : t.en;
  const serviceContent = selectedService === "googledrive" ? content.googleDrive : content.oneDrive;
  const platformContent = serviceContent[selectedPlatform];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
          <Cloud className="w-6 h-6 text-blue-500" />
          {content.title}
        </h2>
        <p className="text-gray-600 mt-1">{content.subtitle}</p>
      </div>

      {/* Service Selection */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">{content.selectService}</p>
        <div className="flex gap-3">
          <button
            onClick={() => handleServiceChange("googledrive")}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              selectedService === "googledrive"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 via-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-800">{content.googleDrive.name}</p>
                <p className="text-xs text-gray-500">{content.googleDrive.description}</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => handleServiceChange("onedrive")}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              selectedService === "onedrive"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-800">{content.oneDrive.name}</p>
                <p className="text-xs text-gray-500">{content.oneDrive.description}</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Platform Selection */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">{content.selectPlatform}</p>
        <div className="flex gap-2">
          <button
            onClick={() => handlePlatformChange("mac")}
            className={`flex-1 p-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
              selectedPlatform === "mac"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Apple className="w-5 h-5" />
            <span className="font-medium">Mac</span>
          </button>
          <button
            onClick={() => handlePlatformChange("windows")}
            className={`flex-1 p-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
              selectedPlatform === "windows"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Monitor className="w-5 h-5" />
            <span className="font-medium">Windows</span>
          </button>
          <button
            onClick={() => handlePlatformChange("linux")}
            className={`flex-1 p-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
              selectedPlatform === "linux"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Terminal className="w-5 h-5" />
            <span className="font-medium">Linux</span>
          </button>
        </div>
      </div>

      {/* Prerequisites */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800">{serviceContent.prerequisites.title}</h3>
        </div>
        <ul className="space-y-1">
          {serviceContent.prerequisites.items.map((item, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-blue-700">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {platformContent.steps.map((step, index) => (
          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(`step-${index}`)}
              className="w-full p-3 flex items-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {index + 1}
              </div>
              <span className="font-medium text-gray-800 text-left flex-1">{step.title}</span>
              {expandedSections.includes(`step-${index}`) ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.includes(`step-${index}`) && (
              <div className="p-4 bg-white border-t border-gray-200">
                <p className="text-gray-600">{step.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {language === "fr" ? "Conseils utiles" : "Helpful Tips"}
        </h3>
        <ul className="space-y-2">
          {platformContent.tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-green-700">
              <span className="text-green-500 mt-0.5">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Troubleshooting */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {content.troubleshooting.title}
        </h3>
        <div className="space-y-3">
          {content.troubleshooting.items.map((item, index) => (
            <div key={index} className="text-sm">
              <p className="font-medium text-orange-800">{item.problem}</p>
              <p className="text-orange-700 mt-1">{item.solution}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {content.securityTips.title}
        </h3>
        <ul className="space-y-1">
          {content.securityTips.items.map((tip, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-purple-700">
              <CheckCircle2 className="w-4 h-4 text-purple-500" />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Save Preferences Button */}
      <div className="pt-4 border-t border-gray-200">
        <Button
          onClick={savePreferences}
          disabled={isSaved}
          className={`w-full ${
            isSaved 
              ? "bg-green-500 hover:bg-green-500 cursor-default" 
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {language === "fr" ? "Choix mémorisé" : "Choice saved"}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {language === "fr" ? "Mémoriser mon choix" : "Save my choice"}
            </>
          )}
        </Button>
        {isSaved && (
          <p className="text-xs text-center text-green-600 mt-2">
            {language === "fr" 
              ? "Votre préférence sera utilisée par défaut" 
              : "Your preference will be used by default"}
          </p>
        )}
      </div>

      {/* External Links */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.open("https://drive.google.com", "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Google Drive
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.open("https://onedrive.live.com", "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          OneDrive
        </Button>
      </div>
    </div>
  );
}
