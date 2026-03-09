import { useState, useEffect } from 'react';

/**
 * Génère un fingerprint unique pour l'appareil basé sur plusieurs caractéristiques
 * Ce fingerprint est stocké dans localStorage pour persistance
 */
export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateFingerprint = async () => {
      // Vérifier si un fingerprint existe déjà
      const storedFingerprint = localStorage.getItem('duoclass_device_fingerprint');
      const storedDeviceName = localStorage.getItem('duoclass_device_name');
      
      if (storedFingerprint) {
        setFingerprint(storedFingerprint);
        setDeviceName(storedDeviceName || getDefaultDeviceName());
        setIsLoading(false);
        return;
      }

      // Collecter les caractéristiques de l'appareil
      const components: string[] = [];

      // User Agent
      components.push(navigator.userAgent);

      // Langue
      components.push(navigator.language);

      // Fuseau horaire
      components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

      // Résolution d'écran
      components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

      // Nombre de cœurs CPU
      components.push(String(navigator.hardwareConcurrency || 0));

      // Mémoire (si disponible)
      const nav = navigator as any;
      if (nav.deviceMemory) {
        components.push(String(nav.deviceMemory));
      }

      // Platform
      components.push(navigator.platform);

      // Plugins (liste simplifiée)
      const plugins = Array.from(navigator.plugins || [])
        .map(p => p.name)
        .slice(0, 5)
        .join(',');
      components.push(plugins);

      // Canvas fingerprint
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = '14px Arial';
          ctx.fillStyle = '#f60';
          ctx.fillRect(125, 1, 62, 20);
          ctx.fillStyle = '#069';
          ctx.fillText('DuoClass', 2, 15);
          ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
          ctx.fillText('DuoClass', 4, 17);
          components.push(canvas.toDataURL());
        }
      } catch (e) {
        // Canvas non disponible
      }

      // WebGL renderer
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            components.push(renderer);
          }
        }
      } catch (e) {
        // WebGL non disponible
      }

      // Générer le hash
      const dataString = components.join('|||');
      const hash = await hashString(dataString);
      
      // Ajouter un identifiant unique pour garantir l'unicité
      const uniqueId = crypto.randomUUID ? crypto.randomUUID() : generateUUID();
      const finalFingerprint = `${hash}-${uniqueId.slice(0, 8)}`;

      // Stocker le fingerprint
      localStorage.setItem('duoclass_device_fingerprint', finalFingerprint);
      
      // Générer et stocker le nom de l'appareil
      const defaultName = getDefaultDeviceName();
      localStorage.setItem('duoclass_device_name', defaultName);

      setFingerprint(finalFingerprint);
      setDeviceName(defaultName);
      setIsLoading(false);
    };

    generateFingerprint();
  }, []);

  const updateDeviceName = (name: string) => {
    localStorage.setItem('duoclass_device_name', name);
    setDeviceName(name);
  };

  return { fingerprint, deviceName, updateDeviceName, isLoading };
}

/**
 * Génère un hash SHA-256 d'une chaîne
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback simple si crypto.subtle n'est pas disponible
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Génère un UUID v4 (fallback)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Génère un nom par défaut pour l'appareil
 */
function getDefaultDeviceName(): string {
  const ua = navigator.userAgent;
  
  // Détecter le type d'appareil
  let deviceType = 'Ordinateur';
  if (/iPad|Tablet/i.test(ua)) {
    deviceType = 'Tablette';
  } else if (/iPhone|Android.*Mobile|Mobile/i.test(ua)) {
    deviceType = 'Téléphone';
  }

  // Détecter l'OS
  let os = 'Inconnu';
  if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/Mac OS|Macintosh/i.test(ua)) {
    os = 'Mac';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
  } else if (/iOS|iPhone|iPad/i.test(ua)) {
    os = 'iOS';
  }

  // Détecter le navigateur
  let browser = '';
  if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Edge|Edg/i.test(ua)) {
    browser = 'Edge';
  }

  return `${deviceType} ${os}${browser ? ` (${browser})` : ''}`;
}

/**
 * Hook pour vérifier et gérer la licence
 */
export function useLicense() {
  const [licenseCode, setLicenseCode] = useState<string | null>(null);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    const storedCode = localStorage.getItem('duoclass_license_code');
    const storedActivated = localStorage.getItem('duoclass_license_activated');
    
    if (storedCode) {
      setLicenseCode(storedCode);
      setIsActivated(storedActivated === 'true');
    }
  }, []);

  const saveLicense = (code: string, activated: boolean = false) => {
    localStorage.setItem('duoclass_license_code', code);
    localStorage.setItem('duoclass_license_activated', String(activated));
    setLicenseCode(code);
    setIsActivated(activated);
  };

  const clearLicense = () => {
    localStorage.removeItem('duoclass_license_code');
    localStorage.removeItem('duoclass_license_activated');
    setLicenseCode(null);
    setIsActivated(false);
  };

  return { licenseCode, isActivated, saveLicense, clearLicense };
}
