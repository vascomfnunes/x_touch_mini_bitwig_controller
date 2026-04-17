// ------------------------------- Init ---------------------------------

/**
 * Registers value observers on the 8 remote control parameters of the current
 * device. Updates modeValues[MODE_DEVICE] and refreshes ring LEDs in DEVICE mode.
 * Also enables parameter indication (blue highlight in Bitwig UI).
 */
function bindDeviceObservers() {
  var i;

  for (i = 0; i < ENCODER_COUNT; i++) {
    (function(index) {
      var p = deviceRemotePage.getParameter(index);
      p.setIndication(true);
      p.addValueObserver(128, function(value) {
        modeValues[MODE_DEVICE][index] = value;
        if (currentMode === MODE_DEVICE) {
          setRingValue(index, value);
        }
      });
    })(i);
  }
}

/**
 * Registers value observers on volume, pan, and up to MIXER_SEND_COUNT sends
 * for the selected track. Updates modeValues[MODE_MIXER] and refreshes ring LEDs in
 * MIXER mode.
 */
function bindMixerObservers() {
  var i;
  var vol = selectedTrackCursor.volume();
  var pan = selectedTrackCursor.pan();

  vol.setIndication(true);
  pan.setIndication(true);

  vol.addValueObserver(128, function(value) {
    modeValues[MODE_MIXER][0] = value;

    if (currentMode === MODE_MIXER) {
      setRingValue(0, value);
    }
  });

  pan.addValueObserver(128, function(value) {
    modeValues[MODE_MIXER][1] = value;

    if (currentMode === MODE_MIXER) {
      setRingValue(1, value);
    }
  });

  for (i = 0; i < MIXER_SEND_COUNT; i++) {
    (function(sendIndex) {
      var send = mixerSendBank.getItemAt(sendIndex);
      send.setIndication(true);
      send.addValueObserver(128, function(value) {
        modeValues[MODE_MIXER][sendIndex + 2] = value;

        if (currentMode === MODE_MIXER) {
          setRingValue(sendIndex + 2, value);
        }
      });
    })(i);
  }
}

/**
 * Registers observers on the clip launcher slot bank for the selected track.
 * Watches has-content and playback state; calls updateLauncherFeedbackAt to
 * keep ring and button LEDs in sync with clip state.
 */
function bindLauncherObservers() {
  if (!launcherSlotBank) {
    return;
  }

  if (launcherSlotBank.setIndication) {
    launcherSlotBank.setIndication(true);
  }

  if (launcherSlotBank.addHasContentObserver) {
    launcherSlotBank.addHasContentObserver(function(sceneIndex, hasContent) {
      if (sceneIndex < 0 || sceneIndex >= ENCODER_COUNT) {
        return;
      }

      launcherSlotHasContent[sceneIndex] = hasContent;
      updateLauncherFeedbackAt(sceneIndex);
    });
  }

  if (launcherSlotBank.addPlaybackStateObserver) {
    launcherSlotBank.addPlaybackStateObserver(
      function(sceneIndex, slotState, isQueued) {
        if (sceneIndex < 0 || sceneIndex >= ENCODER_COUNT) {
          return;
        }

        launcherSlotState[sceneIndex] = slotState;
        launcherSlotQueued[sceneIndex] = isQueued;
        updateLauncherFeedbackAt(sceneIndex);
      },
    );
  }
}

/**
 * Populates the modeButtons, modeButtonsCC, extraButtons, and extraButtonsCC
 * lookup objects from the config constants. Called once during init() before
 * any MIDI is processed.
 */
function initButtonMaps() {
  modeButtons.device = MODE_BUTTON_DEVICE_NOTE;
  modeButtons.mixer = MODE_BUTTON_MIXER_NOTE;
  modeButtons.launcher = MODE_BUTTON_LAUNCHER_NOTE;
  modeButtonsCC.device = MODE_BUTTON_DEVICE_CC;
  modeButtonsCC.mixer = MODE_BUTTON_MIXER_CC;
  modeButtonsCC.launcher = MODE_BUTTON_LAUNCHER_CC;

  extraButtons.devicePrev = EXTRA_DEVICE_PREV_NOTE;
  extraButtons.deviceNext = EXTRA_DEVICE_NEXT_NOTE;
  extraButtons.trackPrev = EXTRA_TRACK_PREV_NOTE;
  extraButtons.trackNext = EXTRA_TRACK_NEXT_NOTE;

  extraButtons.back = EXTRA_BACK_NOTE;
  extraButtons.forward = EXTRA_FORWARD_NOTE;
  extraButtons.loop = EXTRA_LOOP_NOTE;
  extraButtons.stop = EXTRA_STOP_NOTE;
  extraButtons.play = EXTRA_PLAY_NOTE;
  extraButtons.record = EXTRA_RECORD_NOTE;

  extraButtonsCC.devicePrev = EXTRA_DEVICE_PREV_CC;
  extraButtonsCC.deviceNext = EXTRA_DEVICE_NEXT_CC;
  extraButtonsCC.trackPrev = EXTRA_TRACK_PREV_CC;
  extraButtonsCC.trackNext = EXTRA_TRACK_NEXT_CC;

  extraButtonsCC.back = EXTRA_BACK_CC;
  extraButtonsCC.forward = EXTRA_FORWARD_CC;
  extraButtonsCC.loop = EXTRA_LOOP_CC;
  extraButtonsCC.stop = EXTRA_STOP_CC;
  extraButtonsCC.play = EXTRA_PLAY_CC;
  extraButtonsCC.record = EXTRA_RECORD_CC;

  extraButtons.deviceRemotePageNext = EXTRA_DEVICE_REMOTE_PAGE_NEXT_NOTE;
  extraButtonsCC.deviceRemotePageNext = EXTRA_DEVICE_REMOTE_PAGE_NEXT_CC;
}
