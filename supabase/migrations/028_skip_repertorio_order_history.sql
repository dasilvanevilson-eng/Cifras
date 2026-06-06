-- Evita poluir o historico quando apenas a ordem das musicas do repertorio muda.

create or replace function public.log_repertorio_musicas_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_repertorio_id uuid;
  v_titulo text;
begin
  if tg_op = 'DELETE' then
    v_repertorio_id = old.repertorio_id;

    select coalesce(m.titulo, old.musica_titulo, 'Musica')
    into v_titulo
    from public.musicas m
    where m.id = old.musica_id;

    v_titulo = coalesce(v_titulo, old.musica_titulo, 'Musica');

    perform public.insert_repertorio_history(
      v_repertorio_id,
      'Musica removida',
      jsonb_build_object('musica', v_titulo)
    );
    return old;
  end if;

  if tg_op = 'INSERT' then
    v_repertorio_id = new.repertorio_id;

    select coalesce(m.titulo, new.musica_titulo, 'Musica')
    into v_titulo
    from public.musicas m
    where m.id = new.musica_id;

    v_titulo = coalesce(v_titulo, new.musica_titulo, 'Musica');

    perform public.insert_repertorio_history(
      v_repertorio_id,
      'Musica adicionada',
      jsonb_build_object('musica', v_titulo, 'tom', new.tom, 'observacao', new.observacao)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_repertorio_id = new.repertorio_id;

    select coalesce(m.titulo, new.musica_titulo, old.musica_titulo, 'Musica')
    into v_titulo
    from public.musicas m
    where m.id = coalesce(new.musica_id, old.musica_id);

    v_titulo = coalesce(v_titulo, new.musica_titulo, old.musica_titulo, 'Musica');

    if old.tom is not distinct from new.tom
      and old.observacao is not distinct from new.observacao
      and old.musica_id is not distinct from new.musica_id
      and old.musica_titulo is not distinct from new.musica_titulo
      and old.musica_artista is not distinct from new.musica_artista
      and old.musica_tom_original is not distinct from new.musica_tom_original
      and old.musica_excluida_em is not distinct from new.musica_excluida_em
      and old.musica_excluida_usuario is not distinct from new.musica_excluida_usuario
    then
      return new;
    end if;

    perform public.insert_repertorio_history(
      v_repertorio_id,
      'Musica do repertorio alterada',
      jsonb_build_object(
        'musica', v_titulo,
        'tom_anterior', old.tom,
        'tom_novo', new.tom,
        'observacao_anterior', old.observacao,
        'observacao_nova', new.observacao
      )
    );
    return new;
  end if;

  return null;
end;
$$;
