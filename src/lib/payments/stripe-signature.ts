import 'server-only';

/**
 * La vérification elle-même vit dans le domaine : c'est de la cryptographie
 * pure, sans entrée/sortie, et elle doit être testable sans démarrer de
 * serveur. Ce fichier ne fait que la réexporter côté infrastructure.
 */
export {
  TOLERANCE_SECONDS,
  verifyStripeSignature,
} from '@/domain/payments/signature';
