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

## Testadores (versão web)

O jogo está publicado num link do Claude (artifact "Transição"). Para outras pessoas o abrirem,
partilha-o pelo menu **Partilhar** da página. Cada testador grava a carreira no seu próprio browser.

Para atualizar o link depois de mudanças: `npm run build` e voltar a publicar `web/artifact.html`
com `dist/assets/app.js` e `dist/assets/app.css`.

## Android (Capacitor)

O projeto Android está em `android/` (Capacitor 8.6.2). Para compilar é preciso instalar o
[Android Studio](https://developer.android.com/studio) (traz o Java e o Android SDK) e abri-lo uma vez
para descarregar o SDK. O Android Studio atual traz o Java 25, por isso o wrapper do Gradle foi
atualizado para a 9.1.0 (a 8.14 do Capacitor não corre em Java 25). Se voltares a gerar a pasta
`android/`, repete essa alteração em `android/gradle/wrapper/gradle-wrapper.properties`.

Na linha de comandos, antes de `npm run android:apk`, aponta para o Java do Android Studio:

```bash
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
```

```bash
npm run android        # build web + copia para o projeto Android
npm run android:open   # abre no Android Studio (botão Run para o telemóvel ou emulador)
npm run android:apk    # gera android/app/build/outputs/apk/debug/app-debug.apk
```

Para instalar no telemóvel sem loja: ativar as opções de programador e a depuração USB, ligar por cabo
e carregar em Run no Android Studio, ou copiar a APK de debug para o telemóvel e abri-la.
O `appId` (`com.transicao.app`, em `capacitor.config.ts`) não pode mudar depois de publicar na Play Store.

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
| `web/artifact.html` | Página publicada no link para testadores. |
| `android/` | Projeto Android gerado pelo Capacitor. |

## Regras do motor

- O motor nunca toca na interface. Cada ação recebe o estado e altera-o; a interface aplica-a a uma cópia (`src/ui/useGame.ts`).
- Todo o acaso passa por `src/engine/rng.ts`. Com `setSeed(n)`, testes e simulações são reproduzíveis.
- O jogo grava no `localStorage` do browser (`transicao-save-v3`).

## Próximos passos

1. Compilar e testar a app Android; iOS precisa de um Mac (ou compilação na nuvem) e de conta Apple Developer.
2. Servidor (Supabase, região UE) para contas, gravação na nuvem e ligação ao Strava.
3. Mocks restantes: ficha do atleta, loja, caixa de entrada, patrocínios, calendário, ligação de apps, vista 2D da prova.
