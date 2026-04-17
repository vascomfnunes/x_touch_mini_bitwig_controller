// --------------------------- Runtime State ----------------------------

var midiIn;
var midiOut;
var noteIn;

var transport;

var mainTrackBank;
var selectedTrackCursor;
var selectedDeviceCursor;
var deviceRemotePage;
var mixerSendBank;
var launcherSlotBank;
var launcherSceneBank;

var selectedTrackIndex = 0;

var modeButtons = {};
var modeButtonsCC = {};
var extraButtons = {};
var extraButtonsCC = {};

var currentMode = -1;

// Indexed by mode constant (MODE_DEVICE=0, MODE_MIXER=1, MODE_LAUNCHER=2).
var modeValues = [
  [64, 64, 64, 64, 64, 64, 64, 64], // MODE_DEVICE
  [64, 64, 64, 64, 64, 64, 64, 64], // MODE_MIXER
  [0, 0, 0, 0, 0, 0, 0, 0],         // MODE_LAUNCHER
];

var launcherSlotHasContent = [false, false, false, false, false, false, false, false];
var launcherSlotState = [0, 0, 0, 0, 0, 0, 0, 0];
var launcherSlotQueued = [false, false, false, false, false, false, false, false];
var launcherLastEncoderValue = [-1, -1, -1, -1, -1, -1, -1, -1];

// Separate last-value tracking for mixer encoder 7 (track select), so it
// does not share state with launcherLastEncoderValue across mode switches.
var mixerLastEncoderValue = [-1, -1, -1, -1, -1, -1, -1, -1];

// True while the record button is physically held in LAUNCHER mode; gates
// encoder button presses to record clip slots instead of launching them.
var recordButtonHeld = false;

var firstMidiSeen = false;
var midiPopupCount = 0;
var lastRingOutValue = [-1, -1, -1, -1, -1, -1, -1, -1];
var lastRingOutAt = [0, 0, 0, 0, 0, 0, 0, 0];
var lastButtonLEDSent = {};
