import MainLayout from "@/components/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Scale, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function MentionsLegales() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  const content = language === 'fr' ? {
    title: "Mentions Légales",
    lastUpdate: "Dernière mise à jour : [À COMPLÉTER - DATE]",
    sections: [
      {
        title: "1. Éditeur de l'Application",
        content: `**Raison sociale :** [À COMPLÉTER - NOM DE L'ENTREPRISE]

**Forme juridique :** [À COMPLÉTER - SARL, SAS, Auto-entrepreneur, etc.]

**Capital social :** [À COMPLÉTER - MONTANT] €

**Siège social :**
[À COMPLÉTER - ADRESSE COMPLÈTE]
[À COMPLÉTER - CODE POSTAL] [À COMPLÉTER - VILLE]
France

**Numéro SIRET :** [À COMPLÉTER]

**Numéro RCS :** [À COMPLÉTER - VILLE ET NUMÉRO]

**Numéro de TVA intracommunautaire :** [À COMPLÉTER]

**Directeur de la publication :** [À COMPLÉTER - NOM ET PRÉNOM]

**Contact :**
- Email : contact@duoclass.fr
- Téléphone : [À COMPLÉTER]`
      },
      {
        title: "2. Hébergement",
        content: `**Hébergeur de l'Application :**

[À COMPLÉTER - NOM DE L'HÉBERGEUR]
[À COMPLÉTER - ADRESSE DE L'HÉBERGEUR]
[À COMPLÉTER - PAYS]

**Contact hébergeur :** [À COMPLÉTER]

**Note :** Les données utilisateur (photos, documents) sont stockées localement sur l'appareil de l'utilisateur via IndexedDB et ne transitent pas par nos serveurs, sauf action explicite de l'utilisateur.`
      },
      {
        title: "3. Propriété intellectuelle",
        content: `L'ensemble du contenu de l'Application DuoClass (textes, graphismes, logos, icônes, images, clips audio et vidéo, logiciels, bases de données) est la propriété exclusive de [À COMPLÉTER - NOM DE L'ENTREPRISE] ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.

Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments de l'Application, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de [À COMPLÉTER - NOM DE L'ENTREPRISE].

**Marques et logos :**
DuoClass® est une marque déposée de [À COMPLÉTER - NOM DE L'ENTREPRISE].
[À COMPLÉTER - AUTRES MARQUES SI APPLICABLE]

**Crédits :**
- Design et développement : [À COMPLÉTER]
- Icônes : Lucide Icons (licence MIT)
- Police : [À COMPLÉTER]`
      },
      {
        title: "4. Données personnelles",
        content: `Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant.

**Responsable du traitement :**
[À COMPLÉTER - NOM DE L'ENTREPRISE]
[À COMPLÉTER - ADRESSE]

**Délégué à la Protection des Données (DPO) :**
[À COMPLÉTER - NOM OU "Non applicable"]
Contact : [À COMPLÉTER - EMAIL DPO]

**Pour exercer vos droits :**
Adressez votre demande par email à : contact@duoclass.fr
ou par courrier à l'adresse du siège social.

Pour plus d'informations, consultez notre Politique de Confidentialité.`
      },
      {
        title: "5. Cookies",
        content: `L'Application DuoClass utilise des cookies techniques nécessaires à son fonctionnement.

**Types de cookies utilisés :**
- Cookies de session (authentification)
- Cookies de préférences (langue, thème)
- [À COMPLÉTER - AUTRES COOKIES]

**Cookies tiers :**
- Aucun service de paiement tiers
- [À COMPLÉTER - AUTRES SERVICES TIERS]

Vous pouvez configurer votre navigateur pour refuser les cookies, mais certaines fonctionnalités de l'Application pourraient ne plus être disponibles.`
      },
      {
        title: "6. Limitation de responsabilité",
        content: `[À COMPLÉTER - NOM DE L'ENTREPRISE] s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur l'Application, dont elle se réserve le droit de corriger le contenu à tout moment et sans préavis.

Toutefois, [À COMPLÉTER - NOM DE L'ENTREPRISE] ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition sur l'Application.

En conséquence, [À COMPLÉTER - NOM DE L'ENTREPRISE] décline toute responsabilité :
- Pour toute imprécision, inexactitude ou omission portant sur des informations disponibles sur l'Application
- Pour tous dommages résultant d'une intrusion frauduleuse d'un tiers
- Pour tous dommages, directs ou indirects, quelles qu'en soient les causes, origines, natures ou conséquences

**Sauvegarde des données :**
L'utilisateur est seul responsable de la sauvegarde de ses données. [À COMPLÉTER - NOM DE L'ENTREPRISE] ne pourra être tenue responsable de la perte de données stockées localement.`
      },
      {
        title: "7. Liens hypertextes",
        content: `L'Application peut contenir des liens hypertextes vers d'autres sites internet. [À COMPLÉTER - NOM DE L'ENTREPRISE] n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.

La création de liens hypertextes vers l'Application est soumise à l'accord préalable de [À COMPLÉTER - NOM DE L'ENTREPRISE].`
      },
      {
        title: "8. Droit applicable",
        content: `Les présentes mentions légales sont régies par le droit français.

En cas de litige, et après échec de toute tentative de recherche d'une solution amiable, les tribunaux français seront seuls compétents.

**Médiation de la consommation :**
Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, en cas de litige, le consommateur peut recourir gratuitement au service de médiation :

[À COMPLÉTER - NOM DU MÉDIATEUR]
[À COMPLÉTER - ADRESSE DU MÉDIATEUR]
[À COMPLÉTER - SITE WEB DU MÉDIATEUR]`
      },
      {
        title: "9. Contact",
        content: `Pour toute question concernant ces mentions légales, vous pouvez nous contacter :

**Par email :** contact@duoclass.fr

**Par courrier :**
[À COMPLÉTER - NOM DE L'ENTREPRISE]
[À COMPLÉTER - ADRESSE]
[À COMPLÉTER - CODE POSTAL] [À COMPLÉTER - VILLE]
France

**Formulaire de contact :** [À COMPLÉTER - URL SI APPLICABLE]`
      }
    ]
  } : {
    title: "Legal Notice",
    lastUpdate: "Last updated: [TO BE COMPLETED - DATE]",
    sections: [
      {
        title: "1. Application Publisher",
        content: `**Company name:** [TO BE COMPLETED - COMPANY NAME]

**Legal form:** [TO BE COMPLETED]

**Share capital:** [TO BE COMPLETED] €

**Registered office:**
[TO BE COMPLETED - FULL ADDRESS]
France

**Registration number (SIRET):** [TO BE COMPLETED]

**VAT number:** [TO BE COMPLETED]

**Publication director:** [TO BE COMPLETED - NAME]

**Contact:**
- Email: contact@duoclass.fr
- Phone: [TO BE COMPLETED]`
      },
      {
        title: "2. Hosting",
        content: `**Application host:**

[TO BE COMPLETED - HOST NAME]
[TO BE COMPLETED - HOST ADDRESS]
[TO BE COMPLETED - COUNTRY]

**Host contact:** [TO BE COMPLETED]

**Note:** User data (photos, documents) is stored locally on the user's device via IndexedDB and does not pass through our servers, unless explicitly requested by the user.`
      },
      {
        title: "3. Intellectual Property",
        content: `All content of the DuoClass Application (texts, graphics, logos, icons, images, audio and video clips, software, databases) is the exclusive property of [TO BE COMPLETED - COMPANY NAME] or its partners and is protected by French and international intellectual property laws.

Any reproduction, representation, modification, publication, adaptation of all or part of the Application elements is prohibited without prior written authorization.

**Trademarks and logos:**
DuoClass® is a registered trademark of [TO BE COMPLETED - COMPANY NAME].

**Credits:**
- Design and development: [TO BE COMPLETED]
- Icons: Lucide Icons (MIT license)
- Font: [TO BE COMPLETED]`
      },
      {
        title: "4. Personal Data",
        content: `In accordance with the General Data Protection Regulation (GDPR), you have the right to access, rectify, delete and object to your personal data.

**Data controller:**
[TO BE COMPLETED - COMPANY NAME]
[TO BE COMPLETED - ADDRESS]

**Data Protection Officer (DPO):**
[TO BE COMPLETED - NAME OR "Not applicable"]
Contact: [TO BE COMPLETED - DPO EMAIL]

**To exercise your rights:**
Send your request by email to: contact@duoclass.fr

For more information, see our Privacy Policy.`
      },
      {
        title: "5. Cookies",
        content: `The DuoClass Application uses technical cookies necessary for its operation.

**Types of cookies used:**
- Session cookies (authentication)
- Preference cookies (language, theme)
- [TO BE COMPLETED - OTHER COOKIES]

**Third-party cookies:**
- No third-party payment service
- [TO BE COMPLETED - OTHER THIRD-PARTY SERVICES]

You can configure your browser to refuse cookies, but some features may no longer be available.`
      },
      {
        title: "6. Limitation of Liability",
        content: `[TO BE COMPLETED - COMPANY NAME] strives to ensure the accuracy of information on the Application.

However, [TO BE COMPLETED - COMPANY NAME] cannot guarantee the accuracy, precision or completeness of the information provided.

**Data backup:**
The user is solely responsible for backing up their data. [TO BE COMPLETED - COMPANY NAME] cannot be held responsible for loss of locally stored data.`
      },
      {
        title: "7. Hyperlinks",
        content: `The Application may contain hyperlinks to other websites. [TO BE COMPLETED - COMPANY NAME] has no control over these sites and disclaims any responsibility for their content.`
      },
      {
        title: "8. Applicable Law",
        content: `These legal notices are governed by French law.

In case of dispute, French courts will have sole jurisdiction.

**Consumer mediation:**
[TO BE COMPLETED - MEDIATOR INFORMATION]`
      },
      {
        title: "9. Contact",
        content: `For any questions regarding these legal notices:

**By email:** contact@duoclass.fr

**By mail:**
[TO BE COMPLETED - COMPANY NAME]
[TO BE COMPLETED - ADDRESS]
France`
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
              <Scale className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-800">{content.title}</h1>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">{content.lastUpdate}</p>
          
          {/* Content */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-8">
              {content.sections.map((section, index) => (
                <div key={index} className="bg-white rounded-lg border p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-indigo-700 mb-3 border-b border-indigo-100 pb-2">
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
                      // Bold lines starting with **
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
