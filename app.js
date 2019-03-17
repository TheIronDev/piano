const BaseNoteFrequencies = {
  ['C']: 32.7032,
  ['C#']: 34.64783,
  ['D']: 36.7081,
  ['D#']: 38.89087,
  ['E']: 41.20344,
  ['F']: 43.65353,
  ['F#']: 46.2493,
  ['G']: 48.99943,
  ['G#']: 51.91309,
  ['A']: 55,
  ['A#']: 58.27047,
  ['B']: 61.73541,
};

/**
 * Generates a map of notes (with octaves) to their frequencies.
 * This can all be generated using base notes.
 * See https://en.wikipedia.org/wiki/Piano_key_frequencies for more info.
 * @type {!Object<string, number>}
 */
const KeyFrequencyMap = Object
    .entries(BaseNoteFrequencies)
    .reduce((memo, [baseNote, baseFrequency]) => {
      for (let octave = 1; octave < 8; octave ++) {
        const frequency = baseFrequency * (2 ** (octave - 1));
        memo[`${baseNote}${octave}`] = frequency;
      }
      return memo;
    }, {});

// Map keyboard keys to notes
const NoteKeyMap = {
  a: 'C',
  w: 'C#',
  s: 'D',
  e: 'D#',
  d: 'E',
  f: 'F',
  t: 'F#',
  g: 'G',
  y: 'G#',
  h: 'A',
  u: 'A#',
  j: 'B',
};

// Map keyboard keys to notes of the next octave
const NextOctaveNoteKeyMap = {
  'k': 'C',
  'o': 'C#',
  'l': 'D',
  'p': 'D#',
  ';': 'E',
  "'": 'F',
  ']': 'F#',
};

// Plays the audio
class AudioPlayer {
  constructor(ac) {
    this.ac_ = ac;
    this.buffer_ = null;
    this.activeGainNodes_ = new Map();

    this.getMp3Buffer_();
  }
  getMp3Buffer_() {
    const request = new XMLHttpRequest();

    request.open('GET', './C4.mp3', true);
    request.responseType = 'arraybuffer';

    request.onload = () => {
      const audioData = request.response;
      this.ac_.decodeAudioData(audioData,
          (buffer) =>  (this.buffer_ = buffer),
          (e) => console.log("Error with decoding audio data" + e.error))
    };

    request.send();
  }
  play(note) {
    if (this.activeGainNodes_.get(note)) {
      const gainNode = this.activeGainNodes_.get(note);
      gainNode.gain.setValueAtTime(0, this.ac_.currentTime);
      gainNode.disconnect();
    }
    const gainNode = this.ac_.createGain();
    gainNode.gain.setValueAtTime(1, this.ac_.currentTime);

    const source = this.ac_.createBufferSource();
    source.connect(gainNode);
    source.buffer = this.buffer_;

    // Change playback rate to get different "notes"
    const playbackRate = KeyFrequencyMap[note]/KeyFrequencyMap['C4'];
    source.playbackRate.value = playbackRate;

    source.start(0);

    gainNode.connect(this.ac_.destination);
    this.activeGainNodes_.set(note, gainNode);
  }
  stop(note) {
    const gainNode = this.activeGainNodes_.get(note);
    if (gainNode) {
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.ac_.currentTime + .4);
      setTimeout(() => {
        gainNode.gain.setValueAtTime(0, 0);
        gainNode.disconnect();
      }, 400);
    }
  }
}

// Handles which piano key was pressed, calling appropriate start/stop fns
class Piano {
  constructor(window, element, ac, audioPlayer) {
    this.window_ = window;
    this.ac_ = ac;
    this.audioPlayer_ = audioPlayer;
    this.activeNotes = new Map();
    this.element_ = element;

    this.keyPressedNotes_ = new Map();
    this.octave_ = 4;
    this.bindEventHandlers();
  }
  getNote(ev) {
    if (ev.key) return this.getNoteFromKey(ev.key);
    const {target} = ev;
    const {dataset} = target;
    const {note, octave} = dataset;
    return `${note}${octave}`;
  }
  getNoteFromKey(key) {
    if (NextOctaveNoteKeyMap[key]) return `${NextOctaveNoteKeyMap[key]}${this.octave_ + 1}`;
    if (NoteKeyMap[key]) return `${NoteKeyMap[key]}${this.octave_}`;
    return null;
  }
  bindEventHandlers() {
    this.element_.querySelectorAll('li').forEach((li) => {
      li.addEventListener('mousedown', (ev) => this.onNoteStart(ev));
      li.addEventListener('touchstart', (ev) => this.onNoteStartTouch(ev));

      const noteStopHandler = this.onNoteStop.bind(this);
      li.addEventListener('mouseup', noteStopHandler);
      li.addEventListener('mouseleave', noteStopHandler);
      li.addEventListener('touchcancel', noteStopHandler);
      li.addEventListener('touchend', noteStopHandler);
    });

    // Bind key handlers
    this.window_.addEventListener('keydown', (ev) => this.onNoteStartKeyDown(ev), true);
    this.window_.addEventListener('keyup', (ev) => this.onNoteStopKeyDown(ev), true);
  }
  onNoteActiveToggle(noteString, state) {
    if (!noteString) return;
    const note = noteString.replace(/\d/g, '');
    const octave = noteString.replace(/\D/g, '');

    const query = `[data-note="${note}"][data-octave="${octave}"]`;
    const element = this.element_.querySelector(query);
    element && element.classList.toggle('active', !!state);
  }
  onNoteStart(ev) {
    const note = this.getNote(ev);
    if (!note) return;
    this.activeNotes.set(note, true);
    this.onNoteActiveToggle(note, true);

    this.ac_.resume().then(() => {
      this.audioPlayer_.play(note);
    });
  }
  onNoteStartKeyDown(ev) {
    if (Number.isInteger(Number(ev.key))) {
      this.setKeyboardOctave(Number(ev.key));
      return;
    }
    if (this.keyPressedNotes_.has(ev.key)) return;
    this.keyPressedNotes_.set(ev.key, true);
    this.onNoteStart(ev);
  }
  onNoteStartTouch(ev) {
    ev.preventDefault();
    this.onNoteStart(ev);
  }
  onNoteStop(ev) {
    const note = this.getNote(ev);
    if (!note) return;

    if (!this.activeNotes.get(note)) return;
    this.activeNotes.set(note, false);
    this.onNoteActiveToggle(note, false);

    this.audioPlayer_.stop(note);
  }
  onNoteStopKeyDown(ev) {
    if (Number.isInteger(Number(ev.key))) {
      this.setKeyboardOctave(Number(ev.key));
      return;
    }
    this.keyPressedNotes_.delete(ev.key);
    this.onNoteStop(ev);
  }
  setKeyboardOctave(octave) {
    this.octave_ = octave;
  }
}

window.onload = () => {
  const pianoElement = document.getElementById('piano');
  const ac = new (window.AudioContext || window.webkitAudioContext)();

  const audioPlayer = new AudioPlayer(ac);
  const piano = new Piano(window, pianoElement, ac, audioPlayer);
};

// Load up a service worker so we can have a PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/piano/sw.js').then((registration) => {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}