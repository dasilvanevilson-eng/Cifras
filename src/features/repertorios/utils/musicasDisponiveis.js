const PRIVATE_MUSICA_VISIBILITY = 'privada';

export function filterMusicasDisponiveisParaRepertorio(musicas, userId) {
  const byId = new Map();

  (musicas || []).forEach((musica) => {
    const isPrivate = musica?.visibility === PRIVATE_MUSICA_VISIBILITY;
    const isOwnedByUser = Boolean(userId && (
      musica?.owner_id === userId
      || musica?.created_by === userId
    ));

    if (isPrivate && !isOwnedByUser) {
      return;
    }

    if (musica?.id) {
      byId.set(musica.id, musica);
    }
  });

  return [...byId.values()];
}
