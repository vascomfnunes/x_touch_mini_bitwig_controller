// ------------------------------ Helpers -------------------------------

/** Prints a debug message when DEBUG is enabled. */
function log(msg) {
  if (DEBUG) {
    println("[XTM] " + msg);
  }
}

/** Always prints an informational message regardless of DEBUG flag. */
function info(msg) {
  println("[XTM] " + msg);
}

/** Clamps v to the inclusive range [lo, hi]. */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Formats a byte value as a zero-padded two-digit uppercase hex string. */
function asHex2(v) {
  var s = v.toString(16).toUpperCase();
  return s.length < 2 ? "0" + s : s;
}

/**
 * Returns true if cc is a valid (non-negative) CC number.
 * CC values of -1 are used as a sentinel to disable a button mapping.
 */
function isConfiguredCC(cc) {
  return cc !== undefined && cc !== null && cc >= 0;
}

/**
 * Returns the index of value in arr, or -1 if not found.
 * Used to map incoming CC/note numbers to encoder indices.
 */
function findInArray(arr, value) {
  var i;

  for (i = 0; i < arr.length; i++) {
    if (arr[i] === value) {
      return i;
    }
  }

  return -1;
}

/** Logs an incoming MIDI message when DEBUG_MIDI is enabled, with optional popup. */
function debugMidi(status, data1, data2) {
  if (!DEBUG_MIDI) {
    return;
  }

  var channel = (status & 0x0f) + 1;
  var type = status & 0xf0;
  var line =
    "[XTM MIDI] status=0x" +
    asHex2(status) +
    " type=0x" +
    asHex2(type) +
    " ch=" +
    channel +
    " data1=" +
    data1 +
    " data2=" +
    data2;

  println(line);

  if (DEBUG_MIDI_POPUP && midiPopupCount < DEBUG_MIDI_POPUP_LIMIT) {
    midiPopupCount += 1;
    host.showPopupNotification(line);
  }
}

/** Returns true if the MIDI message is a Note On (velocity > 0). */
function isNoteOn(status, data2) {
  return (status & 0xf0) === 0x90 && data2 > 0;
}

/** Returns true if the MIDI message is a Note Off (0x80 or 0x90 with velocity 0). */
function isNoteOff(status, data2) {
  return (status & 0xf0) === 0x80 || ((status & 0xf0) === 0x90 && data2 === 0);
}

/**
 * Decodes a relative encoder CC value into a signed delta step.
 * Supports RELATIVE_TWO_COMP, RELATIVE_SIGN_BIT, and RELATIVE_BINARY_OFFSET
 * encoding schemes, and optionally collapses the magnitude to ±1 when
 * ENCODER_RELATIVE_DIRECTION_ONLY is enabled.
 *
 * NOTE: ENCODER_RELATIVE_DIRECTION_ONLY takes precedence over ENCODER_MODE —
 * when true it always returns ±1 regardless of which relative scheme is active.
 * This is intentional, but means per-scheme magnitude differences are ignored
 * whenever the flag is set.
 *
 * Returns 0 if no movement is detected.
 */
function decodeRelativeDelta(value) {
  var delta;

  if (ENCODER_RELATIVE_DIRECTION_ONLY) {
    if (value === 64 || value === 0) {
      return 0;
    }
    delta = value > 64 ? 1 : -1;
    return ENCODER_INVERT_DIRECTION ? -delta : delta;
  }

  if (ENCODER_MODE === "RELATIVE_TWO_COMP") {
    if (value === 64 || value === 0) {
      return 0;
    }
    delta = value > 64 ? value - 128 : value;
    return ENCODER_INVERT_DIRECTION ? -delta : delta;
  }

  if (ENCODER_MODE === "RELATIVE_SIGN_BIT") {
    if (value === 64) {
      return 0;
    }
    var magnitude = value & 0x3f;
    if (magnitude === 0) {
      return 0;
    }
    delta = (value & 0x40) !== 0 ? -magnitude : magnitude;
    return ENCODER_INVERT_DIRECTION ? -delta : delta;
  }

  if (ENCODER_MODE === "RELATIVE_BINARY_OFFSET") {
    delta = value - 64;
    return ENCODER_INVERT_DIRECTION ? -delta : delta;
  }

  return 0;
}

/** Calls toggle() on a Bitwig value object. Returns false if not supported. */
function toggleBool(valueObj) {
  if (!valueObj || !valueObj.toggle) {
    return false;
  }

  valueObj.toggle();

  return true;
}

/** Sets a Bitwig ranged value using a 0–127 integer in a 128-step range. Returns false if not supported. */
function setRanged(valueObj, value127) {
  if (!valueObj || !valueObj.set) {
    return false;
  }

  valueObj.set(value127, 128);

  return true;
}

/** Increments a Bitwig ranged value by delta steps in a 128-step range. Returns false if not supported. */
function incRanged(valueObj, delta) {
  if (!valueObj || !valueObj.inc) {
    return false;
  }

  valueObj.inc(delta, 128);
  return true;
}

/**
 * Converts a raw encoder CC value into a ±1 direction.
 * In ABSOLUTE mode, derives direction from the delta vs. the last seen value
 * for this encoder stored in lastValueArr[index] (mutated in place). In
 * relative modes, delegates to decodeRelativeDelta. Returns 0 for the first
 * message or no movement.
 *
 * Pass a dedicated per-mode last-value array (e.g. launcherLastEncoderValue
 * or mixerLastEncoderValue) so that state is not shared across mode switches.
 */
function decodeAbsoluteTurnDelta(index, value, lastValueArr) {
  if (ENCODER_MODE !== "ABSOLUTE") {
    return decodeRelativeDelta(value);
  }

  if (index < 0 || index >= ENCODER_COUNT) {
    return 0;
  }

  var prev = lastValueArr[index];
  lastValueArr[index] = value;

  if (prev < 0) {
    return 0;
  }

  var raw = value - prev;

  if (raw > 64) {
    raw -= 128;
  } else if (raw < -64) {
    raw += 128;
  }

  if (raw === 0) {
    return 0;
  }

  return raw > 0 ? 1 : -1;
}
