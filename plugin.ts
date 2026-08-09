/**
 * Plugin entry point. Registers both actions and connects to Stream Deck.
 * The MIDI port opens lazily on first key press, so startup is instant.
 */
import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { SendNote } from "./actions/send-note";
import { SendControlChangeAction } from "./actions/send-cc";

streamDeck.logger.setLevel(LogLevel.INFO);

streamDeck.actions.registerAction(new SendNote());
streamDeck.actions.registerAction(new SendControlChangeAction());

streamDeck.connect();
