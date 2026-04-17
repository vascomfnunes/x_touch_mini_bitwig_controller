// ------------------------ Parameter Accessors -------------------------

/**
 * Returns the Bitwig parameter object for mixer encoder index:
 * 0=volume, 1=pan, 2–7=sends 0–5. Returns null if unavailable.
 */
function getMixerParameter(index) {
  if (!selectedTrackCursor) {
    return null;
  }

  if (index === 0) {
    return selectedTrackCursor.volume();
  }

  if (index === 1) {
    return selectedTrackCursor.pan();
  }

  if (index >= 2 && index <= 7 && mixerSendBank) {
    return mixerSendBank.getItemAt(index - 2);
  }

  return null;
}

/** Returns the parameter for encoder index in the active mode, or null in LAUNCHER mode. */
function getCurrentParameter(index) {
  if (currentMode === MODE_DEVICE && deviceRemotePage) {
    return deviceRemotePage.getParameter(index);
  }

  if (currentMode === MODE_MIXER) {
    return getMixerParameter(index);
  }

  return null;
}

/** Sets the active mode's encoder parameter to an absolute 0–127 value. */
function setCurrentParameterValue(index, value127) {
  var p = getCurrentParameter(index);

  if (!p) {
    return;
  }

  setRanged(p, clamp(Math.round(value127), 0, 127));
}

/**
 * Increments the active mode's encoder parameter by delta. Tries incRanged
 * first; falls back to absolute set using the cached value if the API does
 * not support increment.
 */
function incCurrentParameterValue(index, delta) {
  var p = getCurrentParameter(index);

  if (!p) {
    return;
  }

  if (!incRanged(p, delta)) {
    // Fallback: compute new value from cache. The cached value is observer-
    // driven, so it may lag behind if the observer hasn't fired yet for the
    // previous set — small inaccuracies are possible on rapid turns.
    var arr = getActiveValuesArray();
    setCurrentParameterValue(index, arr[index] + delta);
  }
}

// --------------------------- Track/Device Nav -------------------------

function trySelectPrevDevice() {
  if (!selectedDeviceCursor || !selectedDeviceCursor.selectPrevious) {
    return;
  }

  try {
    selectedDeviceCursor.selectPrevious();
  } catch (e) {
    log("selectPrevious (device) failed: " + e);
  }
}

function trySelectNextDevice() {
  if (!selectedDeviceCursor || !selectedDeviceCursor.selectNext) {
    return;
  }

  try {
    selectedDeviceCursor.selectNext();
  } catch (e) {
    log("selectNext (device) failed: " + e);
  }
}

/**
 * Selects the previous track. Tries selectedTrackCursor.selectPrevious()
 * first, then falls back to mainTrackBank index navigation.
 */
function trySelectPrevTrack() {
  if (selectedTrackCursor && selectedTrackCursor.selectPrevious) {
    try {
      selectedTrackCursor.selectPrevious();
      return;
    } catch (e) {
      log("selectPrevious (track cursor) failed: " + e);
    }
  }

  if (!mainTrackBank) {
    return;
  }

  var idx = selectedTrackIndex > 0 ? selectedTrackIndex - 1 : 0;

  var tr = mainTrackBank.getItemAt(idx);

  try {
    tr.selectInMixer();
  } catch (e) {
    log("selectInMixer (prev track fallback) failed: " + e);
  }
}

/**
 * Selects the next track. Tries selectedTrackCursor.selectNext() first,
 * then falls back to mainTrackBank index navigation.
 */
function trySelectNextTrack() {
  if (selectedTrackCursor && selectedTrackCursor.selectNext) {
    try {
      selectedTrackCursor.selectNext();
      return;
    } catch (e) {
      log("selectNext (track cursor) failed: " + e);
    }
  }

  if (!mainTrackBank) {
    return;
  }

  var idx = selectedTrackIndex < TRACK_SCAN_SIZE - 1 ? selectedTrackIndex + 1 : TRACK_SCAN_SIZE - 1;
  var tr = mainTrackBank.getItemAt(idx);

  try {
    tr.selectInMixer();
  } catch (e) {
    log("selectInMixer (next track fallback) failed: " + e);
  }
}

// --------------------------- Mode Handlers ----------------------------

/**
 * Switches to newMode (MODE_DEVICE, MODE_MIXER, or MODE_LAUNCHER).
 * No-ops if already in the requested mode. Updates mode LEDs and ring LEDs for
 * the new mode's cached values.
 */
function setMode(newMode) {
  if (
    newMode !== MODE_DEVICE &&
    newMode !== MODE_MIXER &&
    newMode !== MODE_LAUNCHER
  ) {
    return;
  }

  if (currentMode === newMode) {
    return;
  }

  currentMode = newMode;

  if (recordButtonHeld) {
    recordButtonHeld = false;
    setButtonLED(extraButtons.record, false);
  }

  refreshModeLEDs();
  refreshRingLEDs();
  refreshLauncherButtonLEDs();
  info("Mode: " + MODE_NAMES[currentMode]);
}

/** Navigates the device remote control page. Negative delta = previous, positive = next. */
function moveDeviceRemotePage(delta) {
  if (!deviceRemotePage) {
    return;
  }

  if (delta < 0) {
    if (deviceRemotePage.selectPreviousPage) {
      try {
        deviceRemotePage.selectPreviousPage(true);
      } catch (e) {
        log("selectPreviousPage failed: " + e);
      }
    }
  } else if (deviceRemotePage.selectNextPage) {
    try {
      deviceRemotePage.selectNextPage(true);
    } catch (e) {
      log("selectNextPage failed: " + e);
    }
  }
}

/** Scrolls the send bank on the selected track. Negative delta = backwards, positive = forwards. */
function scrollMixerSends(delta) {
  if (!mixerSendBank) {
    return;
  }

  if (delta < 0) {
    if (mixerSendBank.scrollBackwards) {
      mixerSendBank.scrollBackwards();
    }
  } else if (mixerSendBank.scrollForwards) {
    mixerSendBank.scrollForwards();
  }
}

/** Scrolls the scene bank. Negative delta = backwards, positive = forwards. */
function scrollLauncherScenes(delta) {
  if (!launcherSceneBank) {
    return;
  }

  if (delta < 0) {
    if (launcherSceneBank.scrollBackwards) {
      launcherSceneBank.scrollBackwards();
    }
  } else if (launcherSceneBank.scrollForwards) {
    launcherSceneBank.scrollForwards();
  }
}

/** Launches the clip slot at index on the selected track's clip launcher. */
function launchSelectedTrackSlot(index) {
  if (!launcherSlotBank) {
    return;
  }

  try {
    launcherSlotBank.launch(index);
  } catch (e) {
    log("launch slot " + index + " failed: " + e);
  }
}

/** Starts recording into the clip slot at index on the selected track's clip launcher. */
function recordSelectedTrackSlot(index) {
  if (!launcherSlotBank) {
    return;
  }
  try {
    launcherSlotBank.record(index);
  } catch (e) {
    log("record slot " + index + " failed: " + e);
  }
}

/** Stops all playing clips on the selected track's clip launcher. */
function stopSelectedTrackClips() {
  if (!launcherSlotBank || !launcherSlotBank.stop) {
    return;
  }

  try {
    launcherSlotBank.stop();
  } catch (e) {
    log("stop clips failed: " + e);
  }
}

/**
 * Handles encoder button presses in DEVICE mode:
 * 0=toggle device on/off, 1=prev device, 2=next device,
 * 6=prev track, 7=next track.
 */
function handleDeviceButton(index) {
  switch (index) {
    case 0:
      toggleBool(selectedDeviceCursor.isEnabled());
      break;
    case 1:
      trySelectPrevDevice();
      break;
    case 2:
      trySelectNextDevice();
      break;
    case 6:
      trySelectPrevTrack();
      break;
    case 7:
      trySelectNextTrack();
      break;
  }
}

/**
 * Handles encoder button presses in MIXER mode:
 * 0=mute, 1=solo, 2=arm, 3=select in mixer,
 * 6=prev track, 7=next track.
 */
function handleMixerButton(index) {
  switch (index) {
    case 0:
      toggleBool(selectedTrackCursor.mute());
      break;
    case 1:
      toggleBool(selectedTrackCursor.solo());
      break;
    case 2:
      toggleBool(selectedTrackCursor.arm());
      break;
    case 3:
      if (selectedTrackCursor.selectInMixer) {
        selectedTrackCursor.selectInMixer();
      }
      break;
    case 6:
      trySelectPrevTrack();
      break;
    case 7:
      trySelectNextTrack();
      break;
  }
}

/**
 * Handles an encoder turn event. Behaviour depends on the current mode:
 * - LAUNCHER: encodes direction only (±1); encoder 0 scrolls scenes, encoder 1
 *   selects tracks, others are unassigned.
 * - MIXER: encoder 7 (knob 8) selects tracks; encoders 0–6 control parameters.
 * - DEVICE/MIXER (ABSOLUTE): sets the parameter directly to the CC value.
 * - DEVICE/MIXER (relative): increments the parameter by the decoded delta.
 */
function handleEncoderTurn(index, value) {
  if (index < 0 || index >= ENCODER_COUNT) {
    return;
  }

  var delta;

  if (currentMode === MODE_LAUNCHER) {
    delta = decodeAbsoluteTurnDelta(index, value, launcherLastEncoderValue);
    if (delta === 0) return;
    if (index === 0) scrollLauncherScenes(delta);
    if (index === 1) {
      if (delta < 0) trySelectPrevTrack();
      else trySelectNextTrack();
    }
    return;
  }

  if (currentMode === MODE_MIXER && index === 7) {
    delta = decodeAbsoluteTurnDelta(index, value, mixerLastEncoderValue);

    if (delta < 0) trySelectPrevTrack();
    else if (delta > 0) trySelectNextTrack();

    return;
  }

  if (ENCODER_MODE === "ABSOLUTE") {
    setCurrentParameterValue(index, value);
    return;
  }

  delta = decodeRelativeDelta(value);

  if (delta === 0) {
    return;
  }

  incCurrentParameterValue(index, delta * ENCODER_RELATIVE_STEP);
}

/**
 * Handles an encoder button press. Routes to the appropriate per-mode handler:
 * DEVICE → handleDeviceButton, MIXER → handleMixerButton,
 * LAUNCHER → records the clip slot at index if recordButtonHeld, otherwise launches it.
 */
function handleEncoderButton(index, pressed) {
  if (!pressed) {
    return;
  }

  if (index < 0 || index >= ENCODER_COUNT) {
    return;
  }

  if (currentMode === MODE_DEVICE) {
    handleDeviceButton(index);
    return;
  }

  if (currentMode === MODE_MIXER) {
    handleMixerButton(index);
    return;
  }

  if (recordButtonHeld) {
    recordSelectedTrackSlot(index);
  } else {
    launchSelectedTrackSlot(index);
  }
}

/** Switches mode when a mode button is pressed. On release, re-asserts mode LEDs
 * since the hardware clears the button LED when the key is released. */
function handleModeButton(id, pressed) {
  if (!pressed) {
    delete lastButtonLEDSent[modeButtons.device];
    delete lastButtonLEDSent[modeButtons.mixer];
    delete lastButtonLEDSent[modeButtons.launcher];
    refreshModeLEDs();
    return;
  }

  if (id === modeButtons.device || id === modeButtonsCC.device) {
    setMode(MODE_DEVICE);
    return;
  }

  if (id === modeButtons.mixer || id === modeButtonsCC.mixer) {
    setMode(MODE_MIXER);
    return;
  }

  if (id === modeButtons.launcher || id === modeButtonsCC.launcher) {
    setMode(MODE_LAUNCHER);
    return;
  }
}

/**
 * Handles presses of the fixed-function buttons (navigation, transport).
 * Mode-sensitive behaviour:
 * - Stop button: stops all clips on the selected track in LAUNCHER mode; stops transport otherwise.
 * - Record button: in LAUNCHER mode, tracks hold state (recordButtonHeld) and lights its LED so
 *   encoder presses record clip slots while held; in other modes, toggles arranger record.
 */
function handleExtraButton(id, pressed) {
  if (id === extraButtons.record || id === extraButtonsCC.record) {
    if (currentMode === MODE_LAUNCHER) {
      recordButtonHeld = pressed;
      setButtonLED(extraButtons.record, pressed);
      return;
    }

    if (!pressed) {
      return;
    }

    if (transport.isArrangerRecordEnabled) {
      toggleBool(transport.isArrangerRecordEnabled());
    }

    return;
  }

  if (!pressed) {
    return;
  }

  if (id === extraButtons.deviceRemotePageNext || id === extraButtonsCC.deviceRemotePageNext) {
    moveDeviceRemotePage(1);
    return;
  }

  if (id === extraButtons.devicePrev || id === extraButtonsCC.devicePrev) {
    trySelectPrevDevice();
    return;
  }

  if (id === extraButtons.deviceNext || id === extraButtonsCC.deviceNext) {
    trySelectNextDevice();
    return;
  }

  if (id === extraButtons.trackPrev || id === extraButtonsCC.trackPrev) {
    trySelectPrevTrack();
    return;
  }

  if (id === extraButtons.trackNext || id === extraButtonsCC.trackNext) {
    trySelectNextTrack();
    return;
  }

  if (id === extraButtons.back || id === extraButtonsCC.back) {
    if (transport.rewind) {
      transport.rewind();
    }
    return;
  }

  if (id === extraButtons.forward || id === extraButtonsCC.forward) {
    if (transport.fastForward) {
      transport.fastForward();
    }
    return;
  }

  if (id === extraButtons.loop || id === extraButtonsCC.loop) {
    if (transport.isArrangerLoopEnabled) {
      toggleBool(transport.isArrangerLoopEnabled());
    }
    return;
  }

  if (id === extraButtons.stop || id === extraButtonsCC.stop) {
    if (currentMode === MODE_LAUNCHER) {
      stopSelectedTrackClips();
      return;
    }
    transport.stop();
    return;
  }

  if (id === extraButtons.play || id === extraButtonsCC.play) {
    transport.play();
    return;
  }
}
