/**
 * "Send MIDI Note" action.
 *
 * Momentary — Note On while held, Note Off on release (default).
 * Toggle    — alternate Note On / Note Off on each press.
 *
 * Extras: lights the key in a chosen accent while active, can auto-label the key
 * with the note name, remembers a default port globally, and answers Test / port
 * requests from the Property Inspector.
 */
import streamDeck, {
  action,
  type KeyDownEvent,
  type KeyUpEvent,
  type SendToPluginEvent,
  SingletonAction,
  type WillAppearEvent,
} from "@elgato/streamdeck";

import { listOutputPorts, sendNoteOn, sendNoteOff } from "../midi";
import { buildLitKeyImage } from "../key-visual";
import { noteName } from "../notes";

type NoteSettings = {
  portName?: string;
  channel?: number; // 1–16 as shown to the user
  note?: number; // 0–127
  velocity?: number; // 0–127
  behavior?: "momentary" | "toggle";
  keyColor?: string; // accent hex used to light the key
  autoLabel?: boolean; // set the key title to the note name
};

type GlobalSettings = { defaultPort?: string };

const DEFAULT_CHANNEL = 1;
const DEFAULT_NOTE = 36;
const DEFAULT_VELOCITY = 127;
const DEFAULT_COLOR = "#7c3aed";
const TEST_NOTE_MS = 160;

function toWireChannel(channel: number | undefined): number {
  return (channel ?? DEFAULT_CHANNEL) - 1;
}

@action({ UUID: "com.angelocreates.midibridge.note" })
export class SendNote extends SingletonAction<NoteSettings> {
  private readonly toggledOn = new Map<string, boolean>();

  /** On first appearance: adopt the global default port and auto-label if asked. */
  override async onWillAppear(ev: WillAppearEvent<NoteSettings>): Promise<void> {
    const settings = ev.payload.settings;

    if (!settings.portName) {
      const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      if (globals.defaultPort) {
        settings.portName = globals.defaultPort;
        await ev.action.setSettings(settings);
      }
    }

    if (settings.autoLabel && settings.note !== undefined) {
      await ev.action.setTitle(noteName(settings.note));
    }
  }

  override async onKeyDown(ev: KeyDownEvent<NoteSettings>): Promise<void> {
    const s = ev.payload.settings;
    const channel = toWireChannel(s.channel);
    const note = s.note ?? DEFAULT_NOTE;
    const velocity = s.velocity ?? DEFAULT_VELOCITY;
    const color = s.keyColor ?? DEFAULT_COLOR;

    if ((s.behavior ?? "momentary") === "toggle") {
      const isOn = this.toggledOn.get(ev.action.id) ?? false;
      if (isOn) {
        sendNoteOff(s.portName ?? "", channel, note);
        await ev.action.setImage(); // reset to default when latched off
      } else {
        sendNoteOn(s.portName ?? "", channel, note, velocity);
        await ev.action.setImage(buildLitKeyImage(color));
      }
      this.toggledOn.set(ev.action.id, !isOn);
    } else {
      sendNoteOn(s.portName ?? "", channel, note, velocity);
      await ev.action.setImage(buildLitKeyImage(color));
    }

    this.pulse();
  }

  override async onKeyUp(ev: KeyUpEvent<NoteSettings>): Promise<void> {
    const s = ev.payload.settings;
    if ((s.behavior ?? "momentary") === "toggle") return;

    const channel = toWireChannel(s.channel);
    const note = s.note ?? DEFAULT_NOTE;
    sendNoteOff(s.portName ?? "", channel, note);
    await ev.action.setImage(); // reset the flash
  }

  /** Handle Property Inspector requests: port list, test send, set default port. */
  override async onSendToPlugin(
    ev: SendToPluginEvent<{ event?: string; port?: string }, NoteSettings>,
  ): Promise<void> {
    const message = ev.payload?.event;

    if (message === "getPorts") {
      await streamDeck.ui.current?.sendToPropertyInspector({ event: "ports", ports: listOutputPorts() });
      return;
    }

    if (message === "test") {
      const s = await ev.action.getSettings();
      const channel = toWireChannel(s.channel);
      const note = s.note ?? DEFAULT_NOTE;
      sendNoteOn(s.portName ?? "", channel, note, s.velocity ?? DEFAULT_VELOCITY);
      this.pulse();
      setTimeout(() => sendNoteOff(s.portName ?? "", channel, note), TEST_NOTE_MS);
      return;
    }

    if (message === "setDefaultPort" && ev.payload.port) {
      await streamDeck.settings.setGlobalSettings<GlobalSettings>({ defaultPort: ev.payload.port });
    }
  }

  /** Blink the Property Inspector's activity LED (only visible while configuring). */
  private pulse(): void {
    void streamDeck.ui.current?.sendToPropertyInspector({ event: "activity" });
  }
}
