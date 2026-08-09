# MIDI Bridge — a free Stream Deck → MIDI plugin (v1.1)

Turns any Stream Deck key into a MIDI controller. Holds a **persistent** MIDI
connection and fires a Note (or CC) the instant you press a key — tight enough for
hot-cueing in djay Pro. Built on Elgato's official SDK. Free, yours, reskinnable.

**Two actions:**
- **Send MIDI Note** — Note On/Off. Momentary or Toggle.
- **Send MIDI CC** — Control Change. For switch-style controls (filter, bass kill, FX).

---

## New in v1.1 (the upgraded panel)

- **Interactive piano note-picker** — click a key to set the note, with an octave
  stepper and a live note-name readout (e.g. `C2`). No more guessing MIDI numbers.
- **Sliders with live values** — channel, velocity, and CC on/off values.
- **Test send** — fire the message straight from the panel to confirm routing
  without touching the physical key. Great for djay MIDI-learn.
- **Activity LED** — pulses in the header whenever a message actually goes out.
- **Port status pill** — shows at a glance whether your MIDI port is online
  (loopMIDI running) or offline, with a one-click refresh.
- **Key lighting** — pick an accent color; the key lights in that color while held
  (momentary) or while latched on (toggle), and dims when off.
- **Auto-label** — optionally set the key's title to its note name automatically.
- **Default port memory** — "Set default port" stores your port globally so every
  new key you add adopts it automatically.

> Want to preview the look without building? Open `ui/send-note.html` in a browser —
> the visuals render standalone (the controls only bind once it's running in Stream Deck).

---

## How it works

```
Stream Deck key  ─▶  this plugin (Node)  ─▶  virtual MIDI port  ─▶  djay Pro MIDI Learn
   keyDown            sends Note/CC           loopMIDI (Win)         binds note → action
                      instantly               IAC Driver (Mac)
```

loopMIDI/IAC is the free virtual port — unaffected by the paid-plugin situation.
This plugin is the Stream-Deck-side sender that replaces the paid ones.

---

## Prerequisites

| Need | Where |
|---|---|
| Node.js 20+ | nodejs.org |
| Stream Deck app 6.6+ | already installed |
| Elgato CLI | `npm install -g @elgato/cli` |
| loopMIDI (Windows) | tobias-erichsen.de → loopMIDI |
| IAC Driver (Mac) | built in — Audio MIDI Setup |

Create one virtual port first:
- **Windows:** loopMIDI → **+** → name it `StreamDeck` → right-click tray → *Start minimized*.
- **Mac:** Audio MIDI Setup → MIDI Studio → double-click **IAC Driver** → tick *Device is online*.

---

## Build & install

```bash
npm install -g @elgato/cli   # the `streamdeck` command — run once, then reopen the terminal
npm install                  # deps; postinstall puts @julusian/midi inside the .sdPlugin
npm run build                # bundles src/ → com.angelocreates.midibridge.sdPlugin/bin/plugin.js
streamdeck link com.angelocreates.midibridge.sdPlugin
streamdeck restart com.angelocreates.midibridge
```

> If `streamdeck` isn't recognized after installing the CLI, reopen the terminal or
> use `npx @elgato/cli link com.angelocreates.midibridge.sdPlugin`.

The `@julusian/midi` install-script warning from npm is expected — it's just the
library fetching its prebuilt native binary.

---

## Using it

1. Drag **Send MIDI Note** onto a key.
2. Pick your **Port**, click a note on the piano, set channel/velocity, choose a color.
3. Hit **Test send** — the activity LED pulses and (if djay is in MIDI-learn) the
   control binds. Or press the physical key.
4. In djay Pro → MIDI mapping, learn each key. Save the mapping.

Notes line up with the XL layout guide (36–67). Use **Send MIDI CC** for the
filter / bass-kill toggles.

---

## Launcher

`start-dj-rig.bat` (in this folder) starts loopMIDI + the Stream Deck app in order.
Run it before you play, or drop a shortcut to it in your Startup folder
(`Win + R` → `shell:startup`) to have the rig come up at login.

---

## Dev loop

```bash
npm run watch
```

Logs:
- **Windows:** `%appdata%\Elgato\StreamDeck\Plugins\com.angelocreates.midibridge.sdPlugin\logs`
- **Mac:** `~/Library/Application Support/com.elgato.StreamDeck/Plugins/com.angelocreates.midibridge.sdPlugin/logs`

Package to share: `streamdeck pack com.angelocreates.midibridge.sdPlugin` → a
double-clickable `.streamDeckPlugin`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Status pill says "Port offline" | loopMIDI/IAC not running | Start it, create the `StreamDeck` port, hit refresh |
| Test send does nothing in djay | djay not in MIDI-learn, or wrong port | Select the port; put djay in MIDI mapping first |
| Key doesn't light | Behavior/color unset | Pick a color; lighting fires on press automatically |
| "cannot find module @julusian/midi" | native lib missing in .sdPlugin | Re-run `npm install`, or install it into the .sdPlugin folder |
| Nothing appears in Stream Deck | not linked / wrong folder | Re-run `streamdeck link` on the `.sdPlugin` folder |

---

## Project layout

```
midi-bridge/
├── start-dj-rig.bat        launcher (loopMIDI + Stream Deck)
├── package.json
├── rollup.config.mjs
├── tsconfig.json
├── src/
│   ├── plugin.ts           registers actions, connects
│   ├── midi.ts             persistent MIDI output manager
│   ├── notes.ts            MIDI note-number → name
│   ├── key-visual.ts       builds the "lit key" SVG
│   └── actions/
│       ├── send-note.ts
│       └── send-cc.ts
└── com.angelocreates.midibridge.sdPlugin/
    ├── manifest.json
    ├── bin/                built output (npm run build)
    ├── ui/                 property inspector (HTML + theme + logic)
    └── imgs/               plugin + action icons
```
