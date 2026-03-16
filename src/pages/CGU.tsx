import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileText, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";

const CGU_FR = [
  {
    title: "Article 1 - Objet",
    content: `Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions d'utilisation de l'application DuoClass (ci-après « l'Application »), ainsi que de définir les droits et obligations des parties dans ce cadre.

L'Application DuoClass est un service de gestion de photos et documents numériques permettant aux utilisateurs d'organiser, classer, retoucher et créer des compositions à partir de leurs médias personnels. Les utilisateurs conservent la responsabilité du stockage de leurs fichiers (sur leur ordinateur, disque externe, Google Drive, ou tout autre support de leur choix).`
  },
  {
    title: "Article 2 - Mentions légales",
    content: `L'Application DuoClass est éditée par :

• Nom : [À COMPLÉTER - NOM COMPLET]
• Statut : Particulier (évolution prévue vers auto-entrepreneur, puis société)
• Adresse : [À COMPLÉTER - ADRESSE COMPLÈTE]
• Email de contact : [À COMPLÉTER - EMAIL]
• Numéro SIRET/SIREN : [À COMPLÉTER - LE CAS ÉCHÉANT]`
  },
  {
    title: "Article 3 - Accès et utilisation",
    content: `CONDITIONS D'ACCÈS

L'accès à l'Application est soumis aux conditions suivantes :

• L'utilisateur doit être âgé d'au moins 18 ans ou avoir l'autorisation d'un représentant légal
• L'utilisateur accepte les présentes CGU sans réserve
• L'utilisateur s'engage à respecter la législation applicable, notamment en matière de droits d'auteur et de protection des données

PÉRIODE D'ESSAI GRATUITE

Une période d'essai gratuite de 14 jours est proposée à chaque nouvel utilisateur. Durant cette période :

• L'utilisateur a accès à toutes les fonctionnalités de l'Application
• Aucun paiement n'est demandé
• À l'expiration des 14 jours, l'accès est suspendu jusqu'au paiement`
  },
  {
    title: "Article 4 - Utilisation autorisée et interdite",
    content: `UTILISATION AUTORISÉE

✅ La consultation, exploration et lecture de l'Application
✅ L'organisation et classification de ses propres médias
✅ La retouche et édition de ses propres photos
✅ La création de compositions personnelles
✅ L'export de ses créations pour usage personnel

UTILISATION INTERDITE

❌ Importer ou télécharger du contenu illégal, contrefait ou violant les droits d'autrui
❌ Créer du contenu destiné à la revente ou à un usage commercial sans autorisation
❌ Utiliser l'Application à des fins commerciales ou professionnelles sans accord préalable
❌ Exporter ou distribuer du contenu créé via l'Application sans respecter les droits d'auteur
❌ Modifier ou altérer le fonctionnement de l'Application
❌ Accéder à l'Application par des moyens non autorisés (piratage, contournement de sécurité, etc.)

IMPORTANT : Toute action interdite mentionnée ci-dessus annule automatiquement le droit de rétractation de l'utilisateur.`
  },
  {
    title: "Article 5 - Tarification et paiement",
    content: `TARIFS

L'accès à l'Application DuoClass est proposé au tarif de :

• 49€ (paiement unique)

MODALITÉS DE PAIEMENT

• Le paiement s'effectue par activation d'une licence fournie par l'administrateur
• Le paiement est unique et donne accès permanent à l'Application

FACTURATION

• Une facture est générée automatiquement lors du paiement
• La facture est accessible depuis le compte utilisateur
• L'Application est fournie en tant que service numérique (pas de bien physique)`
  },
  {
    title: "Article 6 - Droit de rétractation",
    content: `DÉLAI DE RÉTRACTATION

Conformément à la Directive 2011/83/UE, l'utilisateur dispose d'un délai de 14 jours calendaires à compter de la date de paiement pour exercer son droit de rétractation, sans avoir à justifier sa décision ni à payer de pénalité.

CONDITIONS DE VALIDITÉ

Le droit de rétractation s'applique uniquement si l'utilisateur n'a pas commencé à utiliser l'Application de manière substantielle.

Sont considérées comme des utilisations substantielles annulant le droit de rétractation :

❌ Import de fichiers : télécharger des photos ou documents dans l'Application
❌ Création de contenu : créer des albums, catégories ou compositions
❌ Utilisation active : utiliser les outils de retouche, filtres ou édition
❌ Export de fichiers : exporter ou télécharger du contenu créé
❌ Modifications : apporter des modifications à des fichiers ou compositions

À l'inverse, sont autorisées sans perte du droit de rétractation :

✅ Consultation : explorer l'interface et les fonctionnalités
✅ Lecture : consulter la documentation et les tutoriels
✅ Navigation : parcourir les menus et paramètres

EXERCICE DU DROIT

Pour exercer son droit de rétractation, l'utilisateur doit :

1. Envoyer une demande écrite via le formulaire de rétractation disponible dans l'Application
2. Ou envoyer un email à : [À COMPLÉTER - EMAIL DE SUPPORT]
3. Inclure : nom, email, date d'achat, numéro de commande (si disponible)

TRAITEMENT

• La demande sera traitée dans les 30 jours suivant sa réception
• Le remboursement sera effectué via le même moyen de paiement utilisé pour l'achat
• Aucun frais ne sera retenu pour l'exercice du droit de rétractation

EXCEPTIONS

Le droit de rétractation ne s'applique pas si :

• L'utilisateur a utilisé l'Application de manière substantielle
• L'utilisateur a dépassé le délai de 14 jours
• L'utilisateur a accepté explicitement de renoncer à son droit de rétractation`
  },
  {
    title: "Article 7 - Responsabilité et limitations",
    content: `RESPONSABILITÉ DE L'UTILISATEUR

L'utilisateur est seul responsable :

• De la conservation et de la sauvegarde de ses fichiers
• Du contenu qu'il importe dans l'Application
• Du respect de la législation applicable lors de l'utilisation de l'Application
• De la confidentialité de ses identifiants de connexion

LIMITATION DE RESPONSABILITÉ

L'Application est fournie « en l'état » sans garantie d'aucune sorte. L'éditeur ne peut être tenu responsable de :

• La perte ou la corruption de données
• Les interruptions de service ou les bugs
• Les dommages indirects ou consécutifs
• L'utilisation abusive de l'Application par des tiers

SAUVEGARDE DES DONNÉES

L'utilisateur reconnaît que l'Application ne constitue pas un système de sauvegarde. Il est de sa responsabilité de maintenir des sauvegardes régulières de ses fichiers sur des supports externes.`
  },
  {
    title: "Article 8 - Données personnelles et RGPD",
    content: `COLLECTE DE DONNÉES

L'Application collecte les données personnelles suivantes :

• Nom et prénom
• Adresse email
• Code de licence (activation manuelle)
• Données d'utilisation (logs d'accès, actions effectuées)

UTILISATION DES DONNÉES

Les données personnelles sont utilisées pour :

• Gérer l'accès à l'Application
• Traiter les paiements et les remboursements
• Améliorer le service
• Respecter les obligations légales

DROITS DE L'UTILISATEUR

Conformément au RGPD, l'utilisateur dispose des droits suivants :

• Droit d'accès à ses données
• Droit de rectification
• Droit à l'effacement (« droit à l'oubli »)
• Droit à la portabilité des données
• Droit d'opposition au traitement

Pour exercer ces droits, l'utilisateur peut contacter : [À COMPLÉTER - EMAIL DE CONTACT]

CONSERVATION DES DONNÉES

Les données personnelles sont conservées pendant la durée d'utilisation de l'Application et supprimées dans les 30 jours suivant la résiliation du compte.`
  },
  {
    title: "Article 9 - Propriété intellectuelle",
    content: `PROPRIÉTÉ DE L'APPLICATION

L'Application, son code source, son interface et tous les éléments qui la composent sont la propriété exclusive de l'éditeur. Toute reproduction, modification ou distribution sans autorisation est interdite.

PROPRIÉTÉ DU CONTENU UTILISATEUR

L'utilisateur conserve l'intégrité des droits sur le contenu qu'il crée ou importe dans l'Application. L'éditeur n'a aucun droit sur ce contenu.`
  },
  {
    title: "Article 10 - Résiliation et suspension",
    content: `RÉSILIATION PAR L'ÉDITEUR

L'éditeur se réserve le droit de suspendre ou de résilier l'accès à l'Application en cas de :

• Violation des présentes CGU
• Utilisation abusive ou frauduleuse
• Non-paiement

CONSÉQUENCES DE LA RÉSILIATION

Après résiliation :

• L'accès à l'Application est immédiatement suspendu
• Les données de l'utilisateur sont conservées pendant 30 jours, puis supprimées
• L'utilisateur peut télécharger ses données avant suppression`
  },
  {
    title: "Article 11 - Modifications des CGU",
    content: `L'éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les modifications prennent effet :

• Immédiatement pour les nouvelles conditions
• 30 jours après notification pour les utilisateurs existants

L'utilisation continue de l'Application après la notification implique l'acceptation des nouvelles conditions.`
  },
  {
    title: "Article 12 - Droit applicable et juridiction",
    content: `DROIT APPLICABLE

Les présentes CGU sont régies par la loi française.

RÉSOLUTION DES LITIGES

En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, le litige sera soumis aux juridictions compétentes du ressort de [À COMPLÉTER - LIEU DE JURIDICTION].

MÉDIATION

L'utilisateur peut également recourir à la médiation en contactant : [À COMPLÉTER - CONTACT MÉDIATION]`
  },
  {
    title: "Article 13 - Contact et support",
    content: `Pour toute question ou réclamation, l'utilisateur peut contacter :

• Email : [À COMPLÉTER - EMAIL DE SUPPORT]
• Formulaire de contact : [À COMPLÉTER - URL DU FORMULAIRE]
• Formulaire de rétractation : [À COMPLÉTER - URL DU FORMULAIRE]

L'éditeur s'engage à répondre dans les 5 jours ouvrables.`
  }
];

const CGU_EN = [
  {
    title: "Article 1 - Purpose",
    content: `The present Terms and Conditions of Use (hereinafter « Terms ») are intended to define the terms and conditions of use of the DuoClass application (hereinafter « the Application »), as well as to define the rights and obligations of the parties in this context.

The DuoClass Application is a service for managing digital photos and documents that allows users to organize, classify, retouch and create compositions from their personal media. Users retain responsibility for storing their files (on their computer, external hard drive, Google Drive, or any other storage medium of their choice).`
  },
  {
    title: "Article 2 - Legal Information",
    content: `The DuoClass Application is published by:

• Name: [TO BE COMPLETED - FULL NAME]
• Status: Individual (planned evolution towards self-employed, then company)
• Address: [TO BE COMPLETED - FULL ADDRESS]
• Contact email: [TO BE COMPLETED - EMAIL]
• SIRET/SIREN number: [TO BE COMPLETED - IF APPLICABLE]`
  },
  {
    title: "Article 3 - Access and Use",
    content: `ACCESS CONDITIONS

Access to the Application is subject to the following conditions:

• The user must be at least 18 years old or have the authorization of a legal representative
• The user accepts the present Terms without reservation
• The user undertakes to comply with applicable legislation, in particular regarding copyright and data protection

FREE TRIAL PERIOD

A free trial period of 14 days is offered to each new user. During this period:

• The user has access to all features of the Application
• No payment is requested
• Upon expiration of the 14 days, access is suspended until payment`
  },
  {
    title: "Article 4 - Authorized and Prohibited Use",
    content: `AUTHORIZED USE

✅ Consultation, exploration and reading of the Application
✅ Organization and classification of own media
✅ Retouching and editing of own photos
✅ Creation of personal compositions
✅ Export of creations for personal use

PROHIBITED USE

❌ Import or upload illegal, counterfeit or infringing content
❌ Create content intended for resale or commercial use without authorization
❌ Use the Application for commercial or professional purposes without prior agreement
❌ Export or distribute content created via the Application without respecting copyright
❌ Modify or alter the functioning of the Application
❌ Access the Application by unauthorized means (hacking, security bypass, etc.)

IMPORTANT: Any prohibited action mentioned above automatically cancels the user's right of withdrawal.`
  },
  {
    title: "Article 5 - Pricing and Payment",
    content: `RATES

Access to the DuoClass Application is offered at the rate of:

• €49 (one-time payment)

PAYMENT METHODS

• Payment is made by activating a license provided by the administrator
• Payment is one-time and provides permanent access to the Application

BILLING

• An invoice is automatically generated upon payment
• The invoice is accessible from the user account
• The Application is provided as a digital service (not a physical good)`
  },
  {
    title: "Article 6 - Right of Withdrawal",
    content: `WITHDRAWAL PERIOD

In accordance with Directive 2011/83/EU, the user has a period of 14 calendar days from the date of payment to exercise their right of withdrawal, without having to justify their decision or pay any penalty.

CONDITIONS FOR VALIDITY

The right of withdrawal applies only if the user has not begun to use the Application in a substantial manner.

The following are considered substantial uses that cancel the right of withdrawal:

❌ File Import: uploading photos or documents to the Application
❌ Content Creation: creating albums, categories or compositions
❌ Active Use: using retouching tools, filters or editing features
❌ File Export: exporting or downloading created content
❌ Modifications: making changes to files or compositions

Conversely, the following are permitted without loss of the right of withdrawal:

✅ Consultation: exploring the interface and features
✅ Reading: consulting documentation and tutorials
✅ Navigation: browsing menus and settings

EXERCISE OF THE RIGHT

To exercise the right of withdrawal, the user must:

1. Send a written request via the withdrawal form available in the Application
2. Or send an email to: [TO BE COMPLETED - SUPPORT EMAIL]
3. Include: name, email, date of purchase, order number (if available)

PROCESSING

• The request will be processed within 30 days of receipt
• The refund will be made via the same payment method used for the purchase
• No fees will be retained for exercising the right of withdrawal

EXCEPTIONS

The right of withdrawal does not apply if:

• The user has used the Application in a substantial manner
• The user has exceeded the 14-day period
• The user has explicitly agreed to waive their right of withdrawal`
  },
  {
    title: "Article 7 - Liability and Limitations",
    content: `USER RESPONSIBILITY

The user is solely responsible for:

• The preservation and backup of their files
• The content they import into the Application
• Compliance with applicable legislation when using the Application
• The confidentiality of their login credentials

LIMITATION OF LIABILITY

The Application is provided « as is » without any warranty whatsoever. The publisher cannot be held responsible for:

• Loss or corruption of data
• Service interruptions or bugs
• Indirect or consequential damages
• Misuse of the Application by third parties

DATA BACKUP

The user acknowledges that the Application is not a backup system. It is the user's responsibility to maintain regular backups of their files on external media.`
  },
  {
    title: "Article 8 - Personal Data and GDPR",
    content: `DATA COLLECTION

The Application collects the following personal data:

• First and last name
• Email address
• License code (manual activation)
• Usage data (access logs, actions performed)

USE OF DATA

Personal data is used for:

• Managing access to the Application
• Processing payments and refunds
• Improving the service
• Complying with legal obligations

USER RIGHTS

In accordance with the GDPR, the user has the following rights:

• Right of access to their data
• Right to rectification
• Right to erasure (« right to be forgotten »)
• Right to data portability
• Right to object to processing

To exercise these rights, the user can contact: [TO BE COMPLETED - CONTACT EMAIL]

DATA RETENTION

Personal data is retained for the duration of use of the Application and deleted within 30 days of account termination.`
  },
  {
    title: "Article 9 - Intellectual Property",
    content: `APPLICATION OWNERSHIP

The Application, its source code, its interface and all elements that compose it are the exclusive property of the publisher. Any reproduction, modification or distribution without authorization is prohibited.

USER CONTENT OWNERSHIP

The user retains all rights to the content they create or import into the Application. The publisher has no rights to this content.`
  },
  {
    title: "Article 10 - Termination and Suspension",
    content: `TERMINATION BY THE PUBLISHER

The publisher reserves the right to suspend or terminate access to the Application in the event of:

• Violation of these Terms
• Abusive or fraudulent use
• Non-payment

CONSEQUENCES OF TERMINATION

After termination:

• Access to the Application is immediately suspended
• User data is retained for 30 days, then deleted
• The user can download their data before deletion`
  },
  {
    title: "Article 11 - Modifications to the Terms",
    content: `The publisher reserves the right to modify these Terms at any time. Modifications take effect:

• Immediately for new conditions
• 30 days after notification for existing users

Continued use of the Application after notification implies acceptance of the new conditions.`
  },
  {
    title: "Article 12 - Applicable Law and Jurisdiction",
    content: `APPLICABLE LAW

These Terms are governed by French law.

DISPUTE RESOLUTION

In case of dispute, the parties undertake to seek an amicable solution. Failing this, the dispute will be submitted to the competent courts of the jurisdiction of [TO BE COMPLETED - PLACE OF JURISDICTION].

MEDIATION

The user may also resort to mediation by contacting: [TO BE COMPLETED - MEDIATION CONTACT]`
  },
  {
    title: "Article 13 - Contact and Support",
    content: `For any questions or complaints, the user can contact:

• Email: [TO BE COMPLETED - SUPPORT EMAIL]
• Contact form: [TO BE COMPLETED - FORM URL]
• Withdrawal form: [TO BE COMPLETED - FORM URL]

The publisher undertakes to respond within 5 business days.`
  }
];

export default function CGU() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  const sections = language === 'fr' ? CGU_FR : CGU_EN;
  const title = language === 'fr' ? "Conditions Générales d'Utilisation" : "Terms and Conditions of Use";
  const lastUpdate = language === 'fr' ? "Dernière mise à jour : [À COMPLÉTER - DATE]" : "Last updated: [TO BE COMPLETED - DATE]";
  const backLabel = language === 'fr' ? 'Retour' : 'Back';

  return (
    <Layout title={title}>
      <div className="max-w-4xl mx-auto w-full py-4">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation('/utilitaires')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">{lastUpdate}</p>
        
        {/* Content */}
        <div className="space-y-6 pb-8">
          {sections.map((section, index) => (
            <div key={index} className="bg-white rounded-lg border p-4 shadow-sm">
              <h2 className="text-lg font-bold text-blue-700 mb-3 border-b border-blue-100 pb-2">
                {section.title}
              </h2>
              <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {section.content}
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </Layout>
  );
}
