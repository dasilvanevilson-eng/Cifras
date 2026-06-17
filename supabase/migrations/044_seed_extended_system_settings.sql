-- Adiciona opcoes visuais avancadas da tela de Personalizacao.

insert into system_settings (key, value, category, label, description, is_public)
values
  ('theme_mode', '"auto"'::jsonb, 'theme', 'Tema do sistema', 'Define se a interface usa tema claro, escuro ou automatico.', true),
  ('chord_color', '"#c8792b"'::jsonb, 'cifras', 'Cor dos acordes', 'Cor aplicada aos acordes nas cifras.', true),
  ('chord_font_family', '"ibm_plex_mono"'::jsonb, 'cifras', 'Fonte das cifras', 'Fonte monoespacada usada nas cifras para preservar alinhamento.', true),
  ('chord_font_size', '22'::jsonb, 'cifras', 'Tamanho padrao da cifra', 'Tamanho visual padrao usado para leitura de cifras.', true),
  ('interface_density', '"comfortable"'::jsonb, 'theme', 'Densidade da interface', 'Controla espacamentos gerais da interface.', true),
  ('execution_theme', '"auto"'::jsonb, 'execucao', 'Tema padrao da execucao', 'Tema inicial do modo execucao para usuarios sem preferencia local.', true),
  ('execution_font_size', '32'::jsonb, 'execucao', 'Fonte padrao da execucao', 'Tamanho inicial da fonte no modo execucao.', true),
  ('execution_autoscroll_speed', '3'::jsonb, 'execucao', 'Velocidade padrao da rolagem', 'Velocidade inicial da rolagem automatica.', true),
  ('execution_two_columns', 'false'::jsonb, 'execucao', 'Duas colunas por padrao', 'Preferencia visual para leitura em duas colunas.', true)
on conflict (key) do nothing;
