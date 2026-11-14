# DG Estética — elementos de personalização para V2

## Revisão do fundo — espaço da hero

O banner da prévia agora usa `fundo-espaco-civic-v2.png` (1672 × 941): Civic azul, LEDs hexagonais brancos, faixa laranja, prateleiras de produtos, cortina preta e piso cinza refletivo, com base nas referências da hero de estetica_v2. Prompt completo em `PROMPT-ESPACO-V2.md`. O fundo anterior permanece como alternativa; a logo original foi preservada.

Quatro imagens novas geradas pela ferramenta integrada imagegen, baseadas nos cards de serviços de estetica/assets/services. A logo foi copiada integralmente de estetica/assets/dg-logo-original.png, sem recriação.

Abra ../../personalizacao.html para ver os recortes, o exemplo de banner e a paleta. A prévia funciona diretamente no navegador, sem instalação.

## Arquivos

| Arquivo | Dimensões | Uso |
| --- | --- | --- |
| vitrificacao-premium.png | 1402 × 1122 | Recorte transparente para vitrificação/proteção |
| higienizacao-premium.png | 1367 × 1151 | Recorte transparente para higienização |
| vidros-premium.png | 1374 × 1145 | Recorte transparente para vidros/espelhos |
| fundo-detalhamento-panoramico.png | 1536 × 1024 | Fundo opaco para banner, com espaço para texto à esquerda |
| dg-logo-original.png | 1088 × 881 | Logo original, copiada sem alterações |
| dg-personalizacao.css | — | Paleta, fontes locais, cards, divisor angular e banner responsivo |
| PROMPTS.md | — | Prompts completos e referências de geração |

## Aplicação

No HTML dentro da pasta site, carregue assets/personalizacao/dg-personalizacao.css depois de scrollcraft.css. Adicione class="dg-theme" ao elemento html para ativar a identidade DG, incluindo a substituição do acento verde padrão do Scrollcraft por laranja. O CSS é opcional: os PNGs podem ser usados isoladamente.

Exemplo:

```html
<link rel="stylesheet" href="scrollcraft.css">
<link rel="stylesheet" href="assets/personalizacao/dg-personalizacao.css">
<img src="assets/personalizacao/vitrificacao-premium.png"
     width="1402" height="1122" loading="lazy"
     alt="Kit de aplicação de proteção cerâmica">
```

Use object-fit: contain nos recortes para manter todos os objetos visíveis. Para o fundo, use object-fit: cover; no celular, escureça o fundo atrás do texto, como no exemplo de personalizacao.html. Títulos e textos ficam no HTML e continuam editáveis. A fonte Exo 2 já existente em assets/fonts é usada pelo CSS.

Na inspeção inicial não havia index.html na pasta site. Por isso, a entrega está organizada como coleção independente e prévia, pronta para incorporar à página principal. Os arquivos scrollcraft.css e scrollcraft.js existentes não foram alterados.

As imagens novas são ilustrações geradas para comunicação visual dos serviços, não registros de equipamentos ou trabalhos reais da empresa. Transparência dos três recortes conferida no canal alfa; logo conferida por hash contra o original.

