-- Agenda e individual por usuario, inclusive para administradores.

create index if not exists agenda_eventos_created_by_inicio_idx
  on public.agenda_eventos (created_by, inicio);

drop policy if exists "Agenda autenticados leem eventos" on public.agenda_eventos;
drop policy if exists "Agenda autenticados criam eventos" on public.agenda_eventos;
drop policy if exists "Agenda autores ou admins alteram eventos" on public.agenda_eventos;
drop policy if exists "Agenda autores ou admins excluem eventos" on public.agenda_eventos;
drop policy if exists "Agenda autenticados leem repertorios de eventos" on public.agenda_evento_repertorios;
drop policy if exists "Agenda autores ou admins vinculam repertorios" on public.agenda_evento_repertorios;
drop policy if exists "Agenda autores ou admins removem vinculos" on public.agenda_evento_repertorios;

create policy "Agenda usuarios leem proprios eventos"
on public.agenda_eventos for select
to authenticated
using (created_by = auth.uid());

create policy "Agenda usuarios criam proprios eventos"
on public.agenda_eventos for insert
to authenticated
with check (created_by = auth.uid());

create policy "Agenda usuarios alteram proprios eventos"
on public.agenda_eventos for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "Agenda usuarios excluem proprios eventos"
on public.agenda_eventos for delete
to authenticated
using (created_by = auth.uid());

create policy "Agenda usuarios leem vinculos dos proprios eventos"
on public.agenda_evento_repertorios for select
to authenticated
using (
  exists (
    select 1
    from public.agenda_eventos ae
    where ae.id = evento_id
      and ae.created_by = auth.uid()
  )
);

create policy "Agenda usuarios vinculam repertorios aos proprios eventos"
on public.agenda_evento_repertorios for insert
to authenticated
with check (
  exists (
    select 1
    from public.agenda_eventos ae
    where ae.id = evento_id
      and ae.created_by = auth.uid()
  )
);

create policy "Agenda usuarios removem vinculos dos proprios eventos"
on public.agenda_evento_repertorios for delete
to authenticated
using (
  exists (
    select 1
    from public.agenda_eventos ae
    where ae.id = evento_id
      and ae.created_by = auth.uid()
  )
);
