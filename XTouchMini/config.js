// ------------------------- User Customisation -------------------------

var DEBUG = false;
var DEBUG_MIDI = false;
var DEBUG_MIDI_POPUP = false;
var DEBUG_MIDI_POPUP_LIMIT = 30;

var MIDI_CHANNEL = 10; // 0-based: 10 = channel 11
var MIDI_OUTPUT_CHANNEL = 10;

var ENCODER_MODE = "ABSOLUTE"; // ABSOLUTE | RELATIVE_TWO_COMP | RELATIVE_SIGN_BIT | RELATIVE_BINARY_OFFSET
var ENCODER_RELATIVE_STEP = 1;
var ENCODER_RELATIVE_DIRECTION_ONLY = true;
var ENCODER_INVERT_DIRECTION = false;

var ENABLE_RING_FEEDBACK = true;
// The X-Touch Mini echoes back ring LED CC values on the same CC numbers used
// for encoder input (ENCODER_CCS === ENCODER_RING_CCS). RING_ECHO_WINDOW_MS
// controls how long after a ring send incoming messages with the same CC value
// are suppressed. Too short risks real encoder turns being misidentified; too
// long risks genuine rapid turns being dropped. 80 ms is empirically reliable.
var RING_ECHO_WINDOW_MS = 80;
var BUTTON_LED_OUTPUT_IS_NOTE = true;

var MAP_MAIN_FADER_TO_MOD_WHEEL = true;
var MAIN_FADER_CC = 9;
var MOD_WHEEL_CC = 1;

var ENCODER_COUNT = 8;
var TRACK_SCAN_SIZE = 64;
var MIXER_SEND_COUNT = 6;
var LAUNCHER_SCENE_COUNT = 8;

// Encoders
var ENCODER_CCS = [1, 2, 3, 4, 5, 6, 7, 8];
var ENCODER_RING_CCS = [1, 2, 3, 4, 5, 6, 7, 8];
var ENCODER_BUTTON_NOTES = [0, 1, 2, 3, 4, 5, 6, 7];
var ENCODER_BUTTON_CCS = [];

// Mode buttons
var MODE_BUTTON_DEVICE_NOTE = 8;
var MODE_BUTTON_MIXER_NOTE = 9;
var MODE_BUTTON_LAUNCHER_NOTE = 10;
var MODE_BUTTON_DEVICE_CC = -1;
var MODE_BUTTON_MIXER_CC = -1;
var MODE_BUTTON_LAUNCHER_CC = -1;

// Extra buttons (validated on your unit)
var EXTRA_DEVICE_PREV_NOTE = 12;
var EXTRA_DEVICE_NEXT_NOTE = 13;
var EXTRA_TRACK_PREV_NOTE = 14;
var EXTRA_TRACK_NEXT_NOTE = 15;

var EXTRA_BACK_NOTE = 18;
var EXTRA_FORWARD_NOTE = 19;
var EXTRA_LOOP_NOTE = 20;
var EXTRA_STOP_NOTE = 21;
var EXTRA_PLAY_NOTE = 22;
var EXTRA_RECORD_NOTE = 23;

var EXTRA_DEVICE_PREV_CC = -1;
var EXTRA_DEVICE_NEXT_CC = -1;
var EXTRA_TRACK_PREV_CC = -1;
var EXTRA_TRACK_NEXT_CC = -1;

var EXTRA_BACK_CC = -1;
var EXTRA_FORWARD_CC = -1;
var EXTRA_LOOP_CC = -1;
var EXTRA_STOP_CC = -1;
var EXTRA_PLAY_CC = -1;
var EXTRA_RECORD_CC = -1;

// Top row button 4 (note 11) — next device remote controls page
var EXTRA_DEVICE_REMOTE_PAGE_NEXT_NOTE = 11;
var EXTRA_DEVICE_REMOTE_PAGE_NEXT_CC = -1;

// ------------------------------ Modes ---------------------------------

var MODE_DEVICE = 0;
var MODE_MIXER = 1;
var MODE_LAUNCHER = 2;
var MODE_NAMES = ["DEVICE", "MIXER", "LAUNCHER"];

// Bitwig addPlaybackStateObserver state values (from the Bitwig Controller API).
var SLOT_STATE_PLAYING = 1;
var SLOT_STATE_RECORDING = 2;

// Launcher ring LED values by clip state
var LAUNCHER_RING_STOPPED = 40;
var LAUNCHER_RING_QUEUED = 96;
var LAUNCHER_RING_PLAYING = 110;
var LAUNCHER_RING_RECORDING = 127;
