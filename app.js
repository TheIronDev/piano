// https://en.wikipedia.org/wiki/Piano_key_frequencies
const KeyFrequencyMap = {
  ['A0']: 27.5,
  ['A#0']: 29.13524,
  ['B0']: 30.86771,
  ['C1']: 32.7032,
  ['C#1']: 34.64783,
  ['D1']: 36.7081,
  ['D#1']: 38.89087,
  ['E1']: 41.20344,
  ['F1']: 43.65353,
  ['F#1']: 46.2493,
  ['G1']: 48.99943,
  ['G#1']: 51.91309,
  ['A1']: 55,
  ['A#1']: 58.27047,
  ['B1']: 61.73541,
  ['C2']: 65.40639,
  ['C#2']: 69.29566,
  ['D2']: 73.41619,
  ['D#1']: 77.78175,
  ['E2']: 82.40689,
  ['F2']: 87.30706,
  ['F#2']: 92.49861,
  ['G2']: 97.99886,
  ['G#2']: 103.8262,
  ['A2']: 110.0,
  ['A#2']: 116.5409,
  ['B2']: 123.4708,
  ['C3']: 130.8128,
  ['C#3']: 138.5913,
  ['D3']: 146.8324,
  ['D#3']: 155.5635,
  ['E3']: 164.8138,
  ['F3']: 174.6141,
  ['F#3']: 184.9972,
  ['G3']: 195.9977,
  ['G#3']: 207.6523,
  ['A3']: 220.0,
  ['A#3']: 233.0819,
  ['B3']: 246.9417,
  ['C4']: 261.6256,
  ['C#4']: 277.1826,
  ['D4']: 293.6648,
  ['D#4']: 311.127,
  ['E4']: 329.6276,
  ['F4']: 349.2282,
  ['F#4']: 369.9944,
  ['G4']: 391.9954,
  ['G#4']: 415.3047,
  ['A4']: 440,
  ['A#4']: 466.1638,
  ['B4']: 493.8833,
  ['C5']: 523.2511,
  ['C#5']: 554.3653,
  ['D5']: 587.3295,
  ['D#5']: 622.254,
  ['E5']: 659.2551,
  ['F5']: 698.4565,
  ['F#5']: 739.9888,
  ['G5']: 783.9909,
  ['G#5']: 830.6094,
  ['A5']: 880,
  ['A#5']: 932.3275,
  ['B5']: 987.7666,
  ['C6']: 1046.502,
  ['C#6']: 1108.731,
  ['D6']: 1174.659,
  ['D#6']: 1244.508,
  ['E6']: 1318.51,
  ['F6']: 1396.913,
  ['F#6']: 1479.978,
  ['G6']: 1567.982,
  ['G#6']: 1661.219,
  ['A6']: 1760,
  ['A#6']: 1864.655,
  ['B6']: 1975.533,
  ['C7']: 2093.005,
  ['C#7']: 2217.461,
  ['D7']: 2349.318,
  ['D#7']: 2489.016,
  ['E7']: 2637.02,
  ['F7']: 2793.826,
  ['F#7']: 2959.955,
  ['G7']: 3135.963,
  ['G#7']: 3322.438,
  ['A7']: 3520,
  ['A#7']: 3729.31,
  ['B7']: 3951.066,
  ['C8']: 4186.009
};


class NotesPlayer {
  constructor() {
    this.notes = new Map();
  }
  play(noteName, note) {
    this.notes.set(noteName, note);
  }
  stop() {}
}

class Mp3NotePlayer extends NotesPlayer {
  constructor(ac) {
    super();
    this.ac_ = ac;
    this.buffer_ = null;
    this.activeGainNodes_ = new Map();

    this.getMp3Buffer_();
  }
  getMp3Buffer_() {
    const request = new XMLHttpRequest();

    request.open('GET', './cNote.mp3', true);
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
  constructor(element, ac, notesPlayer) {
    this.ac_ = ac;
    this.notesPlayer_ = notesPlayer;
    this.activeNotes = new Map();
    this.element_ = element;

    this.bindEventHandlers();
  }
  getNote(target) {
    const {dataset} = target;
    const {note, octave} = dataset;
    return `${note}${octave}`;
  }
  bindEventHandlers() {
    this.element_.querySelectorAll('li').forEach((li) => {
      const noteStopHandler = this.onNoteStop.bind(this);

      li.addEventListener('mousedown', (ev) => this.onNoteStart(ev));
      li.addEventListener('touchstart', (ev) => this.onNoteStartTouch(ev));

      li.addEventListener('mouseup', noteStopHandler);
      li.addEventListener('mouseleave', noteStopHandler);
      li.addEventListener('touchcancel', noteStopHandler);
      li.addEventListener('touchend', noteStopHandler);
    });
  }
  onNoteActiveToggle(target, state) {
    target.classList.toggle('active', !!state);
  }
  onNoteStart(ev) {
    const {target} = ev;
    const note = this.getNote(target);
    this.activeNotes.set(note, true);
    this.onNoteActiveToggle(target, true);

    this.ac_.resume().then(() => {
      this.notesPlayer_.play(note);
    });
  }
  onNoteStartTouch(ev) {
    ev.preventDefault();
    this.onNoteStart(ev);
  }
  onNoteStop({target}) {
    const note = this.getNote(target);

    if (!this.activeNotes.get(note)) return;
    this.activeNotes.set(note, false);
    this.onNoteActiveToggle(target, false);

    this.notesPlayer_.stop(note);
  }
}

class App {
  constructor(pianoElement, ac, notesPlayer) {
    this.piano_ = new Piano(pianoElement, ac, notesPlayer);
  }
}

window.onload = () => {
  const pianoElement = document.getElementById('piano');
  const ac = new (window.AudioContext || window.webkitAudioContext)();

  //const notesPlayer = new OscillatorNotePlayer(ac);
  const notesPlayer = new Mp3NotePlayer(ac);
  const app = new App(pianoElement, ac, notesPlayer);
};
