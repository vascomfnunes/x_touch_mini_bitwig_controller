// ------------------------------- MIDI ---------------------------------

/**
 * Returns true if data1 matches any configured extra button CC number.
 * Iterates extraButtonsCC so new entries are picked up automatically.
 */
function isExtraButtonCC(data1) {
  var key;
  for (key in extraButtonsCC) {
    if (
      extraButtonsCC.hasOwnProperty(key) &&
      isConfiguredCC(extraButtonsCC[key]) &&
      data1 === extraButtonsCC[key]
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true if data1 matches any configured extra button note number.
 * Iterates extraButtons so new entries are picked up automatically.
 */
function isExtraButtonNote(data1) {
  var key;

  for (key in extraButtons) {
    if (extraButtons.hasOwnProperty(key) && data1 === extraButtons[key]) {
      return true;
    }
  }
  return false;
}

/**
 * Main MIDI input callback. Routes all incoming messages to the appropriate
 * handler. Ignores messages on channels other than MIDI_CHANNEL.
 *
 * CC routing priority:
 *   1. Main fader → mod wheel passthrough
 *   2. Encoder turn
 *   3. Mode button CC
 *   4. Encoder button CC
 *   5. Extra button CC
 *
 * Note routing priority:
 *   1. Mode button note
 *   2. Encoder button note
 *   3. Extra button note
 */
function onMidi(status, data1, data2) {
  if (!firstMidiSeen && DEBUG_MIDI_POPUP) {
    firstMidiSeen = true;
    host.showPopupNotification("XTM: MIDI input received");
  }

  debugMidi(status, data1, data2);

  var msgType = status & 0xf0;
  var channel = status & 0x0f;

  if (channel !== MIDI_CHANNEL) {
    return;
  }

  if (msgType === 0xb0) {
    if (MAP_MAIN_FADER_TO_MOD_WHEEL && data1 === MAIN_FADER_CC) {
      if (noteIn && noteIn.sendRawMidiEvent) {
        noteIn.sendRawMidiEvent(0xb0, MOD_WHEEL_CC, data2);
      }
      return;
    }

    var encIndex = findInArray(ENCODER_CCS, data1);

    if (encIndex !== -1) {
      if (isLikelyRingEcho(encIndex, data2)) {
        return;
      }
      handleEncoderTurn(encIndex, data2);
      return;
    }

    var pressedCC = data2 > 0;

    if (
      (isConfiguredCC(modeButtonsCC.device) &&
        data1 === modeButtonsCC.device) ||
      (isConfiguredCC(modeButtonsCC.mixer) && data1 === modeButtonsCC.mixer) ||
      (isConfiguredCC(modeButtonsCC.launcher) &&
        data1 === modeButtonsCC.launcher)
    ) {
      handleModeButton(data1, pressedCC);
      return;
    }

    var encBtnCC = findInArray(ENCODER_BUTTON_CCS, data1);

    if (encBtnCC !== -1) {
      handleEncoderButton(encBtnCC, pressedCC);
      return;
    }

    if (isExtraButtonCC(data1)) {
      handleExtraButton(data1, pressedCC);
    }

    return;
  }

  if (msgType === 0x90 || msgType === 0x80) {
    var pressed = isNoteOn(status, data2);
    var released = isNoteOff(status, data2);

    if (!pressed && !released) {
      return;
    }

    if (
      data1 === modeButtons.device ||
      data1 === modeButtons.mixer ||
      data1 === modeButtons.launcher
    ) {
      handleModeButton(data1, pressed);
      return;
    }

    var encBtnNote = findInArray(ENCODER_BUTTON_NOTES, data1);

    if (encBtnNote !== -1) {
      handleEncoderButton(encBtnNote, pressed);
      return;
    }

    if (isExtraButtonNote(data1)) {
      handleExtraButton(data1, pressed);
    }
  }
}
