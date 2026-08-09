/**
 * MIDI output manager (singleton).
 *
 * WHY a singleton: one persistent handle per port, shared across every action
 * instance, so notes fire with minimal latency on key press.
 */
// @julusian/midi is a CommonJS native addon; default-import then destructure so
// named exports resolve reliably when this bundle runs as ESM under Node 20.
import midi from "@julusian/midi";
const { Output } = midi;
type Output = InstanceType<typeof midi.Output>;

const STATUS_NOTE_ON = 0x90;
const STATUS_NOTE_OFF = 0x80;
const STATUS_CONTROL_CHANGE = 0xb0;
const MAX_MIDI_VALUE = 127;

type OpenPort = { name: string; output: Output };
let openPort: OpenPort | null = null;

function clampMidi(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(MAX_MIDI_VALUE, Math.round(value)));
}

/** Names of every available MIDI output (loopMIDI, IAC, hardware…). */
export function listOutputPorts(): string[] {
  const probe = new Output();
  const names: string[] = [];
  for (let i = 0; i < probe.getPortCount(); i++) names.push(probe.getPortName(i));
  probe.closePort();
  return names;
}

/** Is a given port name currently present (i.e. loopMIDI running with it)? */
export function isPortAvailable(portName: string): boolean {
  return !!portName && listOutputPorts().includes(portName);
}

function ensurePort(portName: string): Output | null {
  if (!portName) return null;
  if (openPort && openPort.name === portName) return openPort.output;

  if (openPort) {
    openPort.output.closePort();
    openPort = null;
  }

  const output = new Output();
  const index = listOutputPorts().indexOf(portName);
  if (index === -1) {
    output.closePort();
    return null;
  }
  output.openPort(index);
  openPort = { name: portName, output };
  return output;
}

export function sendNoteOn(portName: string, channel: number, note: number, velocity: number): boolean {
  const output = ensurePort(portName);
  if (!output) return false;
  output.sendMessage([STATUS_NOTE_ON | (channel & 0x0f), clampMidi(note), clampMidi(velocity)]);
  return true;
}

export function sendNoteOff(portName: string, channel: number, note: number): boolean {
  const output = ensurePort(portName);
  if (!output) return false;
  output.sendMessage([STATUS_NOTE_OFF | (channel & 0x0f), clampMidi(note), 0]);
  return true;
}

export function sendControlChange(portName: string, channel: number, controller: number, value: number): boolean {
  const output = ensurePort(portName);
  if (!output) return false;
  output.sendMessage([STATUS_CONTROL_CHANGE | (channel & 0x0f), clampMidi(controller), clampMidi(value)]);
  return true;
}
