import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcutActions {
  // Édition
  onUndo?: () => void;
  onRedo?: () => void;
  
  // Sélection
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onEscape?: () => void;
  
  // Navigation
  onPrevious?: () => void;
  onNext?: () => void;
  onPlayPause?: () => void;
  onFullscreen?: () => void;
  
  // Actions
  onDelete?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onDiaporama?: () => void;
  
  // Zoom
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  // Désactiver les raccourcis quand un input est focus
  disableOnInput?: boolean;
}

export function useKeyboardShortcuts(
  actions: KeyboardShortcutActions,
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, disableOnInput = true } = options;
  const actionsRef = useRef(actions);
  
  // Mettre à jour la référence des actions
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Désactiver si un input/textarea est focus
    if (disableOnInput) {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
    }

    const { ctrlKey, shiftKey, metaKey, key } = event;
    const ctrl = ctrlKey || metaKey; // Support Mac (Cmd) et Windows (Ctrl)
    const currentActions = actionsRef.current;

    // Ctrl+Z : Annuler
    if (ctrl && !shiftKey && key.toLowerCase() === 'z') {
      event.preventDefault();
      currentActions.onUndo?.();
      return;
    }

    // Ctrl+Shift+Z ou Ctrl+Y : Rétablir
    if ((ctrl && shiftKey && key.toLowerCase() === 'z') || (ctrl && key.toLowerCase() === 'y')) {
      event.preventDefault();
      currentActions.onRedo?.();
      return;
    }

    // Ctrl+Shift+A : Désélectionner tout (doit être avant Ctrl+A)
    if (ctrl && shiftKey && key.toLowerCase() === 'a') {
      event.preventDefault();
      currentActions.onDeselectAll?.();
      return;
    }

    // Ctrl+A : Sélectionner tout
    if (ctrl && !shiftKey && key.toLowerCase() === 'a') {
      event.preventDefault();
      currentActions.onSelectAll?.();
      return;
    }

    // Échap : Fermer / Annuler
    if (key === 'Escape') {
      event.preventDefault();
      currentActions.onEscape?.();
      return;
    }

    // Flèche gauche : Précédent
    if (key === 'ArrowLeft' && !ctrl) {
      event.preventDefault();
      currentActions.onPrevious?.();
      return;
    }

    // Flèche droite : Suivant
    if (key === 'ArrowRight' && !ctrl) {
      event.preventDefault();
      currentActions.onNext?.();
      return;
    }

    // Espace : Pause/Lecture
    if (key === ' ') {
      event.preventDefault();
      currentActions.onPlayPause?.();
      return;
    }

    // F : Plein écran
    if (key.toLowerCase() === 'f' && !ctrl) {
      event.preventDefault();
      currentActions.onFullscreen?.();
      return;
    }

    // Suppr / Delete : Supprimer
    if (key === 'Delete' || key === 'Backspace') {
      // Ne pas intercepter Backspace dans les inputs
      if (key === 'Backspace') {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
      }
      event.preventDefault();
      currentActions.onDelete?.();
      return;
    }

    // P : Imprimer (sans Ctrl pour éviter conflit navigateur)
    if (key.toLowerCase() === 'p' && !ctrl) {
      event.preventDefault();
      currentActions.onPrint?.();
      return;
    }

    // E : Exporter (sans Ctrl pour éviter conflit navigateur)
    if (key.toLowerCase() === 'e' && !ctrl) {
      event.preventDefault();
      currentActions.onExport?.();
      return;
    }

    // I : Importer (sans Ctrl pour éviter conflit navigateur)
    if (key.toLowerCase() === 'i' && !ctrl) {
      event.preventDefault();
      currentActions.onImport?.();
      return;
    }

    // + : Zoom avant
    if (key === '+' || key === '=' || (shiftKey && key === '+')) {
      event.preventDefault();
      currentActions.onZoomIn?.();
      return;
    }

    // - : Zoom arrière
    if (key === '-') {
      event.preventDefault();
      currentActions.onZoomOut?.();
      return;
    }

    // D : Lancer le diaporama
    if (key.toLowerCase() === 'd' && !ctrl) {
      event.preventDefault();
      currentActions.onDiaporama?.();
      return;
    }
  }, [disableOnInput]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

// Liste des raccourcis pour la documentation
export const KEYBOARD_SHORTCUTS = [
  {
    category: 'Édition',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Annuler la dernière action' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Rétablir l\'action annulée' },
    ]
  },
  {
    category: 'Sélection',
    shortcuts: [
      { keys: ['Ctrl', 'A'], description: 'Sélectionner tous les éléments' },
      { keys: ['Ctrl', 'Shift', 'A'], description: 'Désélectionner tout' },
      { keys: ['Échap'], description: 'Fermer les fenêtres / Annuler' },
    ]
  },
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['D'], description: 'Lancer le diaporama' },
      { keys: ['←'], description: 'Photo/Document précédent' },
      { keys: ['→'], description: 'Photo/Document suivant' },
      { keys: ['Espace'], description: 'Pause / Lecture (diaporama, vidéo)' },
      { keys: ['F'], description: 'Plein écran (diaporama)' },
    ]
  },
  {
    category: 'Actions',
    shortcuts: [
      { keys: ['Suppr'], description: 'Supprimer les éléments sélectionnés' },
      { keys: ['P'], description: 'Imprimer' },
      { keys: ['E'], description: 'Exporter / Convertir' },
      { keys: ['I'], description: 'Importer' },
    ]
  },
  {
    category: 'Zoom',
    shortcuts: [
      { keys: ['+'], description: 'Agrandir les vignettes' },
      { keys: ['-'], description: 'Réduire les vignettes' },
    ]
  }
];
