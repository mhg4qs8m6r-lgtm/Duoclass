import MainLayout from "@/components/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PolitiqueConfidentialite() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  const content = language === 'fr' ? {
    title: "Politique de Confidentialité",
    lastUpdate: "Dernière mise à jour : [À COMPLÉTER - DATE]",
    intro: `Chez DuoClass, nous accordons une importance primordiale à la protection de vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre application.`,
    sections: [
      {
        title: "1. Responsable du traitement",
        content: `**Identité du responsable :**
[À COMPLÉTER - NOM DE L'ENTREPRISE]
[À COMPLÉTER - ADRESSE]
[À COMPLÉTER - CODE POSTAL] [À COMPLÉTER - VILLE]
France

**Contact :** contact@duoclass.fr

**Délégué à la Protection des Données (DPO) :**
[À COMPLÉTER - NOM OU "Non désigné"]
Email : [À COMPLÉTER]`
      },
      {
        title: "2. Données collectées",
        content: `**2.1. Données que vous nous fournissez directement :**
- Adresse email (lors de l'inscription)
- Nom et prénom (optionnel)
- Code de licence (activation manuelle, aucune donnée de paiement stockée)

**2.2. Données collectées automatiquement :**
- Données de connexion (adresse IP, type de navigateur)
- Données d'utilisation (fonctionnalités utilisées, durée des sessions)
- Cookies techniques et de préférences

**2.3. Données NON collectées :**
- Vos photos et documents (stockés localement sur votre appareil)
- Contenu de vos albums et créations
- Données biométriques

**Important :** Vos photos et documents restent sur votre appareil. Nous n'y avons pas accès sauf si vous choisissez explicitement de les partager ou exporter.`
      },
      {
        title: "3. Finalités du traitement",
        content: `Nous utilisons vos données personnelles pour :

| Finalité | Base légale | Durée de conservation |
|----------|-------------|----------------------|
| Gestion de votre compte | Exécution du contrat | Durée de l'inscription + 3 ans |
| Traitement des paiements | Exécution du contrat | 10 ans (obligation légale) |
| Envoi de notifications | Consentement | Jusqu'au retrait du consentement |
| Amélioration du service | Intérêt légitime | 2 ans |
| Support client | Exécution du contrat | 3 ans après le dernier contact |
| Obligations légales | Obligation légale | Selon la réglementation |

[À COMPLÉTER - AUTRES FINALITÉS SI APPLICABLE]`
      },
      {
        title: "4. Stockage local (IndexedDB)",
        content: `**Principe de confidentialité par conception :**

DuoClass utilise la technologie IndexedDB de votre navigateur pour stocker vos photos et documents. Cela signifie que :

✅ Vos médias restent sur VOTRE appareil
✅ Aucune transmission vers nos serveurs sans votre accord
✅ Vous gardez le contrôle total de vos données
✅ Suppression immédiate en vidant le cache du navigateur

**Limites :**
- Les données ne sont pas synchronisées entre appareils
- La suppression du cache navigateur efface vos données
- Nous vous recommandons de faire des sauvegardes régulières

[À COMPLÉTER - INFORMATIONS SUR LES EXPORTS/SAUVEGARDES]`
      },
      {
        title: "5. Partage des données",
        content: `**5.1. Sous-traitants :**

| Prestataire | Service | Pays | Garanties |
|-------------|---------|------|-----------|
| Aucun | - | - | - |
| [À COMPLÉTER] | Hébergement | [À COMPLÉTER] | [À COMPLÉTER] |
| [À COMPLÉTER] | Analytics | [À COMPLÉTER] | [À COMPLÉTER] |

**5.2. Nous ne vendons JAMAIS vos données**

**5.3. Transferts hors UE :**
Certains de nos prestataires sont situés hors de l'Union Européenne. Dans ce cas, nous nous assurons que des garanties appropriées sont en place (clauses contractuelles types, certification Privacy Shield, etc.).

[À COMPLÉTER - LISTE COMPLÈTE DES SOUS-TRAITANTS]`
      },
      {
        title: "6. Vos droits",
        content: `Conformément au RGPD, vous disposez des droits suivants :

**Droit d'accès :** Obtenir une copie de vos données personnelles
**Droit de rectification :** Corriger des données inexactes
**Droit à l'effacement :** Demander la suppression de vos données
**Droit à la limitation :** Restreindre le traitement de vos données
**Droit à la portabilité :** Recevoir vos données dans un format structuré
**Droit d'opposition :** Vous opposer au traitement de vos données
**Droit de retirer votre consentement :** À tout moment

**Pour exercer vos droits :**
- Email : contact@duoclass.fr
- Courrier : [À COMPLÉTER - ADRESSE]

Nous répondrons à votre demande dans un délai d'un mois.

**Réclamation :**
Vous pouvez introduire une réclamation auprès de la CNIL :
Commission Nationale de l'Informatique et des Libertés
3 Place de Fontenoy, TSA 80715
75334 PARIS CEDEX 07
www.cnil.fr`
      },
      {
        title: "7. Sécurité des données",
        content: `Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :

**Mesures techniques :**
- Chiffrement des communications (HTTPS/TLS)
- Authentification sécurisée
- Stockage local chiffré (IndexedDB)
- Pas de stockage de mots de passe en clair

**Mesures organisationnelles :**
- Accès restreint aux données
- Formation du personnel
- Procédures de gestion des incidents

[À COMPLÉTER - CERTIFICATIONS SI APPLICABLE]

**En cas de violation de données :**
Nous vous informerons dans les 72 heures conformément au RGPD.`
      },
      {
        title: "8. Cookies",
        content: `**8.1. Cookies essentiels (toujours actifs) :**
- Session utilisateur
- Préférences de langue
- Thème d'interface

**8.2. Cookies optionnels :**
- [À COMPLÉTER - ANALYTICS]
- [À COMPLÉTER - AUTRES]

**8.3. Gestion des cookies :**
Vous pouvez gérer vos préférences de cookies via :
- Les paramètres de votre navigateur
- Notre bandeau de consentement (si applicable)

**Durée de conservation des cookies :**
- Cookies de session : supprimés à la fermeture du navigateur
- Cookies persistants : [À COMPLÉTER - DURÉE]`
      },
      {
        title: "9. Mineurs",
        content: `L'Application DuoClass n'est pas destinée aux enfants de moins de 16 ans. Nous ne collectons pas sciemment de données personnelles concernant des mineurs.

Si vous êtes parent ou tuteur et que vous pensez que votre enfant nous a fourni des données personnelles, veuillez nous contacter à contact@duoclass.fr.

[À COMPLÉTER - POLITIQUE SPÉCIFIQUE MINEURS SI APPLICABLE]`
      },
      {
        title: "10. Modifications de cette politique",
        content: `Nous pouvons mettre à jour cette politique de confidentialité périodiquement. En cas de modification substantielle, nous vous en informerons par :
- Notification dans l'Application
- Email (si vous avez un compte)

La date de dernière mise à jour est indiquée en haut de ce document.

Nous vous encourageons à consulter régulièrement cette page.`
      },
      {
        title: "11. Contact",
        content: `Pour toute question concernant cette politique de confidentialité ou vos données personnelles :

**Email :** contact@duoclass.fr

**Courrier :**
[À COMPLÉTER - NOM DE L'ENTREPRISE]
Service Protection des Données
[À COMPLÉTER - ADRESSE]
[À COMPLÉTER - CODE POSTAL] [À COMPLÉTER - VILLE]
France

**Délai de réponse :** 30 jours maximum`
      }
    ]
  } : {
    title: "Privacy Policy",
    lastUpdate: "Last updated: [TO BE COMPLETED - DATE]",
    intro: `At DuoClass, we place paramount importance on protecting your personal data. This privacy policy explains how we collect, use and protect your information when you use our application.`,
    sections: [
      {
        title: "1. Data Controller",
        content: `**Controller identity:**
[TO BE COMPLETED - COMPANY NAME]
[TO BE COMPLETED - ADDRESS]
France

**Contact:** contact@duoclass.fr

**Data Protection Officer (DPO):**
[TO BE COMPLETED - NAME OR "Not designated"]
Email: [TO BE COMPLETED]`
      },
      {
        title: "2. Data Collected",
        content: `**2.1. Data you provide directly:**
- Email address (during registration)
- Name (optional)
- License code (manual activation, no payment data stored)

**2.2. Data collected automatically:**
- Connection data (IP address, browser type)
- Usage data (features used, session duration)
- Technical and preference cookies

**2.3. Data NOT collected:**
- Your photos and documents (stored locally on your device)
- Content of your albums and creations
- Biometric data

**Important:** Your photos and documents remain on your device. We do not have access to them unless you explicitly choose to share or export them.`
      },
      {
        title: "3. Processing Purposes",
        content: `We use your personal data for:

| Purpose | Legal basis | Retention period |
|---------|-------------|------------------|
| Account management | Contract execution | Duration of registration + 3 years |
| Payment processing | Contract execution | 10 years (legal obligation) |
| Sending notifications | Consent | Until consent withdrawal |
| Service improvement | Legitimate interest | 2 years |
| Customer support | Contract execution | 3 years after last contact |
| Legal obligations | Legal obligation | According to regulations |

[TO BE COMPLETED - OTHER PURPOSES IF APPLICABLE]`
      },
      {
        title: "4. Local Storage (IndexedDB)",
        content: `**Privacy by design principle:**

DuoClass uses your browser's IndexedDB technology to store your photos and documents. This means:

✅ Your media stays on YOUR device
✅ No transmission to our servers without your consent
✅ You maintain full control of your data
✅ Immediate deletion by clearing browser cache

**Limitations:**
- Data is not synchronized between devices
- Clearing browser cache deletes your data
- We recommend regular backups

[TO BE COMPLETED - EXPORT/BACKUP INFORMATION]`
      },
      {
        title: "5. Data Sharing",
        content: `**5.1. Subcontractors:**

| Provider | Service | Country | Safeguards |
|----------|---------|---------|------------|
| None | - | - | - |
| [TO BE COMPLETED] | Hosting | [TO BE COMPLETED] | [TO BE COMPLETED] |

**5.2. We NEVER sell your data**

**5.3. Transfers outside EU:**
Some of our providers are located outside the European Union. In such cases, we ensure appropriate safeguards are in place.

[TO BE COMPLETED - COMPLETE LIST OF SUBCONTRACTORS]`
      },
      {
        title: "6. Your Rights",
        content: `Under GDPR, you have the following rights:

**Right of access:** Obtain a copy of your personal data
**Right to rectification:** Correct inaccurate data
**Right to erasure:** Request deletion of your data
**Right to restriction:** Restrict processing of your data
**Right to portability:** Receive your data in a structured format
**Right to object:** Object to processing of your data
**Right to withdraw consent:** At any time

**To exercise your rights:**
- Email: contact@duoclass.fr
- Mail: [TO BE COMPLETED - ADDRESS]

We will respond to your request within one month.

**Complaint:**
You can file a complaint with your local data protection authority.`
      },
      {
        title: "7. Data Security",
        content: `We implement appropriate technical and organizational measures to protect your data:

**Technical measures:**
- Communication encryption (HTTPS/TLS)
- Secure authentication
- Encrypted local storage (IndexedDB)
- No plain text password storage

**Organizational measures:**
- Restricted data access
- Staff training
- Incident management procedures

[TO BE COMPLETED - CERTIFICATIONS IF APPLICABLE]

**In case of data breach:**
We will inform you within 72 hours in accordance with GDPR.`
      },
      {
        title: "8. Cookies",
        content: `**8.1. Essential cookies (always active):**
- User session
- Language preferences
- Interface theme

**8.2. Optional cookies:**
- [TO BE COMPLETED - ANALYTICS]
- [TO BE COMPLETED - OTHERS]

**8.3. Cookie management:**
You can manage your cookie preferences via:
- Your browser settings
- Our consent banner (if applicable)

**Cookie retention period:**
- Session cookies: deleted when browser closes
- Persistent cookies: [TO BE COMPLETED - DURATION]`
      },
      {
        title: "9. Minors",
        content: `The DuoClass Application is not intended for children under 16 years of age. We do not knowingly collect personal data from minors.

If you are a parent or guardian and believe your child has provided us with personal data, please contact us at contact@duoclass.fr.

[TO BE COMPLETED - SPECIFIC MINOR POLICY IF APPLICABLE]`
      },
      {
        title: "10. Policy Changes",
        content: `We may update this privacy policy periodically. In case of substantial changes, we will notify you via:
- Notification in the Application
- Email (if you have an account)

The last update date is indicated at the top of this document.

We encourage you to review this page regularly.`
      },
      {
        title: "11. Contact",
        content: `For any questions regarding this privacy policy or your personal data:

**Email:** contact@duoclass.fr

**Mail:**
[TO BE COMPLETED - COMPANY NAME]
Data Protection Service
[TO BE COMPLETED - ADDRESS]
France

**Response time:** 30 days maximum`
      }
    ]
  };

  return (
    <MainLayout title={content.title} className="no-scroll">
      <div className="h-full flex flex-col p-4">
        <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
          
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation('/utilitaires')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {language === 'fr' ? 'Retour' : 'Back'}
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-green-600" />
              <h1 className="text-xl font-bold text-gray-800">{content.title}</h1>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mb-2">{content.lastUpdate}</p>
          <p className="text-sm text-gray-600 mb-4 bg-green-50 p-3 rounded-lg border border-green-200">
            {content.intro}
          </p>
          
          {/* Content */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-8">
              {content.sections.map((section, index) => (
                <div key={index} className="bg-white rounded-lg border p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-green-700 mb-3 border-b border-green-100 pb-2">
                    {section.title}
                  </h2>
                  <div className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                    {section.content.split('\n').map((line, lineIndex) => {
                      // Highlight placeholders
                      if (line.includes('[À COMPLÉTER') || line.includes('[TO BE COMPLETED')) {
                        return (
                          <p key={lineIndex} className="my-2 bg-yellow-50 border-l-4 border-yellow-400 pl-3 py-1 text-yellow-800">
                            {line}
                          </p>
                        );
                      }
                      // Tables
                      if (line.startsWith('|')) {
                        return (
                          <p key={lineIndex} className="font-mono text-xs bg-gray-50 px-2 py-0.5">
                            {line}
                          </p>
                        );
                      }
                      // Checkmarks
                      if (line.startsWith('✅')) {
                        return (
                          <p key={lineIndex} className="my-1 text-green-700">{line}</p>
                        );
                      }
                      // Bold lines
                      if (line.startsWith('**') && line.includes(':**')) {
                        const parts = line.split(':**');
                        return (
                          <p key={lineIndex} className="my-1">
                            <strong>{parts[0].replace(/\*\*/g, '')}:</strong>{parts[1]}
                          </p>
                        );
                      }
                      // List items
                      if (line.startsWith('- ')) {
                        return (
                          <p key={lineIndex} className="ml-4 my-1">• {line.substring(2)}</p>
                        );
                      }
                      return <p key={lineIndex} className="my-1">{line}</p>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
        </div>
      </div>
    </MainLayout>
  );
}
