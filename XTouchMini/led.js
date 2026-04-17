// ---------------------------- LED Feedback ----------------------------

/**
 * Turns a button LED on or off. Skips the send if the state hasn't changed
 * (deduplication via lastButtonLEDSent). Outputs Note On/Off or CC depending
 * on BUTTON_LED_OUTPUT_IS_NOTE.
 */
function setButtonLED(id, on) {
  if (id === undefined || id === null || id < 0) {
    return;
  }

  var val = on ? 127 : 0;

  if (lastButtonLEDSent[id] === val) {
    return;
  }

  lastButtonLEDSent[id] = val;
  var status = BUTTON_LED_OUTPUT_IS_NOTE ? 0x90 : 0xb0;
  midiOut.sendMidi(status | MIDI_OUTPUT_CHANNEL, id, val);
}

/**
 * Sends a ring LED value (0–127) for the encoder at index. Skips the send
 * if the value hasn't changed. Records the sent value and timestamp for
 * echo detection.
 */
function setRingValue(index, value127) {
  if (!ENABLE_RING_FEEDBACK) {
    return;
  }

  if (index < 0 || index >= ENCODER_RING_CCS.length) {
    return;
  }

  var safe = clamp(Math.round(value127), 0, 127);

  if (safe === lastRingOutValue[index]) {
    return;
  }

  var cc = ENCODER_RING_CCS[index];

  lastRingOutValue[index] = safe;
  lastRingOutAt[index] = Date.now();

  midiOut.sendMidi(0xb0 | MIDI_OUTPUT_CHANNEL, cc, safe);
}

/**
 * Returns true if an incoming CC value looks like the controller echoing back
 * a ring LED value we just sent. Suppresses feedback loops by checking that
 * the value matches the last sent value and arrived within RING_ECHO_WINDOW_MS.
 */
function isLikelyRingEcho(index, value127) {
  if (!ENABLE_RING_FEEDBACK) {
    return false;
  }

  if (index < 0 || index >= ENCODER_RING_CCS.length) {
    return false;
  }

  var now = Date.now();

  return (
    lastRingOutValue[index] === value127 &&
    now - lastRingOutAt[index] < RING_ECHO_WINDOW_MS
  );
}

function refreshModeLEDs() {
  setButtonLED(modeButtons.device, currentMode === MODE_DEVICE);
  setButtonLED(modeButtons.mixer, currentMode === MODE_MIXER);
  setButtonLED(modeButtons.launcher, currentMode === MODE_LAUNCHER);
}

/**
 * Returns the ring LED value (0–127) for a launcher slot based on its current
 * playback state: 0=empty, STOPPED=content present, QUEUED, PLAYING, RECORDING.
 */
function getLauncherRingValue(index) {
  if (index < 0 || index >= ENCODER_COUNT) {
    return 0;
  }

  if (!launcherSlotHasContent[index]) {
    return 0;
  }

  if (launcherSlotState[index] === SLOT_STATE_RECORDING) {
    return LAUNCHER_RING_RECORDING;
  }

  if (launcherSlotQueued[index]) {
    return LAUNCHER_RING_QUEUED;
  }

  if (launcherSlotState[index] === SLOT_STATE_PLAYING) {
    return LAUNCHER_RING_PLAYING;
  }

  return LAUNCHER_RING_STOPPED;
}

function refreshLauncherButtonLEDs() {
  var i;

  for (i = 0; i < ENCODER_COUNT; i++) {
    var on =
      currentMode === MODE_LAUNCHER &&
      (launcherSlotHasContent[i] || launcherSlotState[i] !== 0);
    setButtonLED(ENCODER_BUTTON_NOTES[i], on);
  }
}

/**
 * Recomputes and immediately applies ring and button LED state for a single
 * launcher slot. Called from observers whenever slot content or playback state
 * changes.
 */
function updateLauncherFeedbackAt(index) {
  if (index < 0 || index >= ENCODER_COUNT) {
    return;
  }

  modeValues[MODE_LAUNCHER][index] = getLauncherRingValue(index);

  if (currentMode === MODE_LAUNCHER) {
    setRingValue(index, modeValues[MODE_LAUNCHER][index]);
    setButtonLED(
      ENCODER_BUTTON_NOTES[index],
      launcherSlotHasContent[index] || launcherSlotState[index] !== 0,
    );
  }
}


/**
 * Returns the cached value array for the current mode. Falls back to the
 * DEVICE array if currentMode is not yet set (value is -1 before init).
 */
function getActiveValuesArray() {
  return modeValues[currentMode] || modeValues[MODE_DEVICE];
}

function refreshRingLEDs() {
  var arr = getActiveValuesArray();
  var i;

  for (i = 0; i < ENCODER_COUNT; i++) {
    setRingValue(i, arr[i]);
  }
}

function refreshAllLEDs() {
  refreshModeLEDs();
  refreshRingLEDs();
  refreshLauncherButtonLEDs();
}
