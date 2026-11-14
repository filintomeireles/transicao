# Transição

Jogo mobile de carreira de triatlo em que o atleta és tu: os teus treinos reais fazem evoluir o personagem.
O documento de design está em Claude Docs ("Transição — documento de design").

## Correr

```bash
npm install
npm run dev        # app em http://localhost:5173
npm test           # testes do motor e da importação de treinos
npm run simulate   # simulador de equilíbrio: npm run simulate -- 30 60
npm run build      # versão de produção em dist/
```

## Estrutura

| Pasta | O que tem |
| --- | --- |
| `src/engine/` | Motor do jogo em TypeScript puro, sem interface: treino, fadiga e forma, prova, clube, economia. Corre no browser, no telemóvel, nos testes e no simulador. |
| `src/engine/balance.ts` | Todas as constantes de equilíbrio num só sítio. Mudar aqui e correr `npm run simulate`. |
| `src/engine/data.ts` | Sessões, calendário, clubes, loja, patrocinadores, eventos. |
| `src/engine/import/` | Leitura de ficheiros FIT, GPX e TCX e conversão em sessões e atributos. |
| `src/ui/` | Interface React, um ecrã por ficheiro em `screens/`. Estilo de wireframe: a arte final vem no fim. |
| `tests/` | Testes (Vitest). |
| `tools/simulate.ts` | Simulador: joga milhares de carreiras com várias estratégias e resume os resultados. |
| `prototype/` | O protótipo original num só ficheiro HTML e o simulador antigo, para referência. |

## Regras do motor

- O motor nunca toca na interface. Cada ação recebe o estado e altera-o; a interface aplica-a a uma cópia (`src/ui/useGame.ts`).
- Todo o acaso passa por `src/engine/rng.ts`. Com `setSeed(n)`, testes e simulações são reproduzíveis.
- O jogo grava no `localStorage` do browser (`transicao-save-v3`).

## Próximos passos

1. Empacotar para iOS e Android com Capacitor.
2. Servidor (Supabase, região UE) para contas, gravação na nuvem e ligação ao Strava.
3. Mocks restantes: ficha do atleta, loja, caixa de entrada, patrocínios, calendário, ligação de apps, vista 2D da prova.
