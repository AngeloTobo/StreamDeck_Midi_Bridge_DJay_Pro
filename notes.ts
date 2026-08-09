/** Convert a MIDI note number (0–127) to a name like "C2" (convention: 60 = C4). */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function noteName(note: number): string {
  const octave = Math.floor(note / 12) - 1;
  return NOTE_NAMES[((note % 12) + 12) % 12] + octave;
}
