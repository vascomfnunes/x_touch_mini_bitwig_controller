/**
 * Behringer X-Touch Mini - Generic Device + Mixer Controller for Bitwig Studio
 *
 * INSTALLATION
 * 1. Copy this entire XTouchMini/ folder to your Bitwig controller scripts folder.
 *    macOS: ~/Documents/Bitwig Studio/Controller Scripts/XTouchMini/
 * 2. In Bitwig: Settings -> Controllers -> Add Controller.
 * 3. Select this script and assign X-TOUCH MINI MIDI input/output ports.
 *
 * WORKFLOW
 * - Mode 1 (DEVICE): selected-device remote controls.
 * - Mode 2 (MIXER): selected-track volume/pan/sends.
 * - Mode 3 (LAUNCHER): selected-track clip launching and scene navigation.
 *
 * MODE GUIDE
 * - 2x8 button grid (left -> right):
 *   - Top row: notes 8, 9, 10, 11, 12, 13, 14, 15
 *   - Bottom row: notes 16, 17, 18, 19, 20, 21, 22, 23
 *
 * - Mode buttons (top row, left side):
 *   - Top row button 1 (note 8): DEVICE
 *   - Top row button 2 (note 9): MIXER
 *   - Top row button 3 (note 10): LAUNCHER
 *
 * - DEVICE mode:
 *   - Encoder turns: control selected-device remote controls 1-8.
 *   - Encoder presses:
 *     - 1: device enabled on/off
 *     - 2: previous device
 *     - 3: next device
 *     - 7: previous track
 *     - 8: next track
 *
 * - MIXER mode:
 *   - Encoder turns:
 *     - 1: volume
 *     - 2: pan
 *     - 3-7: sends 1-5
 *     - 8: previous/next track
 *   - Encoder presses:
 *     - 1: mute
 *     - 2: solo
 *     - 3: arm
 *     - 4: select track in mixer
 *     - 7: previous track
 *     - 8: next track
 *
 * - LAUNCHER mode:
 *   - Encoder presses 1-8: launch slot 1-8 on the selected track.
 *   - Hold record button + encoder press 1-8: record into slot 1-8.
 *   - Encoder turns:
 *     - 1: scene bank up/down
 *     - 2: previous/next track
 *     - 3-8: currently unassigned
 *   - Bottom row button 6 (STOP / note 21): stops all clips on selected track.
 *   - Bottom row button 8 (RECORD / note 23): hold as modifier to record clip slots;
 *     LED lights while held. Releases back to normal on button release or mode change.
 *
 * - Top row right-side buttons (all modes):
 *   - Top row button 5 (note 12): previous device
 *   - Top row button 6 (note 13): next device
 *   - Top row button 7 (note 14): previous track
 *   - Top row button 8 (note 15): next track
 *
 * - Bottom row transport buttons (all modes):
 *   - Bottom row button 3 (note 18): rewind
 *   - Bottom row button 4 (note 19): fast forward
 *   - Bottom row button 5 (note 20): loop on/off
 *   - Bottom row button 6 (note 21): stop transport (except LAUNCHER mode)
 *   - Bottom row button 7 (note 22): play transport
 *   - Bottom row button 8 (note 23): arranger record on/off (hold in LAUNCHER mode to record clip slots)
 *
 * NOTE
 * - This script targets Bitwig Controller API 23.
 * - To customise MIDI mappings and behaviour, edit config.js.
 * - To enable debug logging, set DEBUG = true and/or DEBUG_MIDI = true in config.js.
 */

loadAPI(23);

host.defineController(
  "Behringer",
  "X-Touch Mini",
  "1.0.0",
  "7b1df6f8-b7f0-4f16-8c90-1321d35d127f",
  "Vasco Nunes",
);
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["X-TOUCH MINI"], ["X-TOUCH MINI"]);

load("config.js");
load("state.js");
load("helpers.js");
load("led.js");
load("handlers.js");
load("midi.js");
load("observers.js");

function init() {
  midiIn = host.getMidiInPort(0);
  midiOut = host.getMidiOutPort(0);

  midiIn.setMidiCallback(onMidi);
  noteIn = midiIn.createNoteInput("X-Touch Mini Input", "8?????", "9?????");
  noteIn.setShouldConsumeEvents(false);

  transport = host.createTransport();

  mainTrackBank = host.createMainTrackBank(
    TRACK_SCAN_SIZE,
    0,
    LAUNCHER_SCENE_COUNT,
  );

  selectedTrackCursor = host.createCursorTrack(
    MIXER_SEND_COUNT,
    LAUNCHER_SCENE_COUNT,
  );
  selectedDeviceCursor = selectedTrackCursor.createCursorDevice();
  deviceRemotePage = selectedDeviceCursor.createCursorRemoteControlsPage(8);

  mixerSendBank = selectedTrackCursor.sendBank();

  if (mixerSendBank && mixerSendBank.setSizeOfBank) {
    mixerSendBank.setSizeOfBank(MIXER_SEND_COUNT);
  }

  if (selectedTrackCursor.clipLauncherSlotBank) {
    launcherSlotBank = selectedTrackCursor.clipLauncherSlotBank();
  }

  if (mainTrackBank && mainTrackBank.sceneBank) {
    launcherSceneBank = mainTrackBank.sceneBank();
  }

  var i;

  for (i = 0; i < TRACK_SCAN_SIZE; i++) {
    (function(trackIndex) {
      var tr = mainTrackBank.getItemAt(trackIndex);
      tr.addIsSelectedInMixerObserver(function(isSelected) {
        if (isSelected) {
          selectedTrackIndex = trackIndex;
        }
      });
    })(i);
  }

  initButtonMaps();
  bindDeviceObservers();
  bindMixerObservers();
  bindLauncherObservers();

  setMode(MODE_DEVICE);
  refreshAllLEDs();

  info("X-Touch Mini controller initialised (DEVICE + MIXER + LAUNCHER).");
}

function flush() {
  refreshAllLEDs();
}

function exit() {
  var i;
  lastButtonLEDSent = {};
  lastRingOutValue = [-1, -1, -1, -1, -1, -1, -1, -1];

  for (i = 0; i < ENCODER_COUNT; i++) {
    setRingValue(i, 0);
  }

  setButtonLED(modeButtons.device, false);
  setButtonLED(modeButtons.mixer, false);
  setButtonLED(modeButtons.launcher, false);
  setButtonLED(modeButtonsCC.device, false);
  setButtonLED(modeButtonsCC.mixer, false);
  setButtonLED(modeButtonsCC.launcher, false);

  for (i = 0; i < ENCODER_BUTTON_NOTES.length; i++) {
    setButtonLED(ENCODER_BUTTON_NOTES[i], false);
  }

  var key;

  for (key in extraButtons) {
    if (extraButtons.hasOwnProperty(key)) {
      setButtonLED(extraButtons[key], false);
    }
  }
}
