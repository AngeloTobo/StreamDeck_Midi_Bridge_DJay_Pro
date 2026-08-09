/**
 * "Send MIDI CC" action.
 *
 * For switch-style controls djay maps — filter on/off, bass kill, FX enable.
 * Sends onValue on press; offValue on release (momentary) or on the next press
 * (toggle). Same extras as the note action: key lighting, test, default port.
 */
import streamDeck, {
  action,
  type KeyDownEvent,
  type KeyUpEvent,
  type SendToPluginEvent,
  SingletonAction,
  type WillAppearEvent,
} from "@elgato/streamdeck";

import { listOutputPorts, sendControlChange } from "../midi";
import { buildLitKeyImage } from "../key-visual";

type CCSettings = {
  portName?: string;
  channel?: number; // 1–16 as shown to the user
  controller?: number; // 0–127 (CC number)
  onValue?: number; // 0–127
  offValue?: number; // 0–127
  behavior?: "momentary" | "toggle";
  keyColor?: string;
};

type GlobalSettings = { defaultPort?: string };

const DEFAULT_CHANNEL = 1;
const DEFAULT_CONTROLLER = 1;
const DEFAULT_ON = 127;
const DEFAULT_OFF = 0;
const DEFAULT_COLOR = "#e040fb";

function toWireChannel(channel: number | undefined): number {
  return (channel ?? DEFAULT_CHANNEL) - 1;
}

@action({ UUID: "com.angelocreates.midibridge.cc" })
export class SendControlChangeAction extends SingletonAction<CCSettings> {
  private readonly toggledOn = new Map<string, boolean>();

  override async onWillAppear(ev: WillAppearEvent<CCSettings>): Promise<void> {
    const settings = ev.payload.settings;
    if (!settings.portName) {
      const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      if (globals.defaultPort) {
        settings.portName = globals.defaultPort;
        await ev.action.setSettings(settings);
      }
    }
  }

  override async onKeyDown(ev: KeyDownEvent<CCSettings>): Promise<void> {
    const s = ev.payload.settings;
    const channel = toWireChannel(s.channel);
    const controller = s.controller ?? DEFAULT_CONTROLLER;
    const onValue = s.onValue ?? DEFAULT_ON;
    const offValue = s.offValue ?? DEFAULT_OFF;
    const color = s.keyColor ?? DEFAULT_COLOR;

    if ((s.behavior ?? "momentary") === "toggle") {
      const isOn = this.toggledOn.get(ev.action.id) ?? false;
      sendControlChange(s.portName ?? "", channel, controller, isOn ? offValue : onValue);
      await ev.action.setImage(isOn ? undefined : buildLitKeyImage(color));
      this.toggledOn.set(ev.action.id, !isOn);
    } else {
      sendControlChange(s.portName ?? "", channel, controller, onValue);
      await ev.action.setImage(buildLitKeyImage(color));
    }

    this.pulse();
  }

  override async onKeyUp(ev: KeyUpEvent<CCSettings>): Promise<void> {
    const s = ev.payload.settings;
    if ((s.behavior ?? "momentary") === "toggle") return;

    const channel = toWireChannel(s.channel);
    const controller = s.controller ?? DEFAULT_CONTROLLER;
    sendControlChange(s.portName ?? "", channel, controller, s.offValue ?? DEFAULT_OFF);
    await ev.action.setImage();
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<{ event?: string; port?: string }, CCSettings>,
  ): Promise<void> {
    const message = ev.payload?.event;

    if (message === "getPorts") {
      await streamDeck.ui.current?.sendToPropertyInspector({ event: "ports", ports: listOutputPorts() });
      return;
    }

    if (message === "test") {
      const s = await ev.action.getSettings();
      const channel = toWireChannel(s.channel);
      const controller = s.controller ?? DEFAULT_CONTROLLER;
      sendControlChange(s.portName ?? "", channel, controller, s.onValue ?? DEFAULT_ON);
      this.pulse();
      setTimeout(() => sendControlChange(s.portName ?? "", channel, controller, s.offValue ?? DEFAULT_OFF), 160);
      return;
    }

    if (message === "setDefaultPort" && ev.payload.port) {
      await streamDeck.settings.setGlobalSettings<GlobalSettings>({ defaultPort: ev.payload.port });
    }
  }

  private pulse(): void {
    void streamDeck.ui.current?.sendToPropertyInspector({ event: "activity" });
  }
}
