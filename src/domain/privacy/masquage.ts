/**
 * Masquage d'une adresse e-mail pour l'affichage administrateur.
 *
 * Le Poste de commandement n'a pas besoin de l'adresse entière pour faire son
 * travail : reconnaître un compte que l'on cherche, repérer un domaine
 * jetable. Deux lettres et le domaine suffisent aux deux. Le reste est retiré
 * **avant** d'arriver dans la page — pas caché par du style qu'un « voir la
 * source » contournerait.
 *
 * `am•••@gmail.com` : on reconnaît, on ne recopie pas.
 */
export function masquerEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const arobase = email.lastIndexOf('@');
  if (arobase <= 0) return '•••';

  const local = email.slice(0, arobase);
  const domaine = email.slice(arobase + 1);
  const visible = local.slice(0, local.length >= 4 ? 2 : 1);

  return `${visible}•••@${domaine}`;
}
