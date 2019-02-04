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
class OscillatorNotePlayer extends NotesPlayer {
  constructor(ac) {
    super();
    this.ac_ = ac;
    this.oscillator;
  }
  play(note) {
    super.play(note);
    const frequency = KeyFrequencyMap[note] || KeyFrequencyMap['C4'];
    this.oscillator = this.ac_.createOscillator();

    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(frequency, this.ac_.currentTime); // value in hertz
    this.oscillator.connect(this.ac_.destination);
    this.oscillator.start();
  }
  stop(note) {
    this.oscillator.stop();
  }
}

class Mp3NotePlayer extends NotesPlayer {
  constructor(ac) {
    super();
    this.ac_ = ac;
    this.buffer_ = null;
    this.getMp3Buffer_();
  }
  play(note) {
    this.source = this.ac_.createBufferSource();
    this.source.buffer = this.buffer_;

    // Change playback rate to get different "notes"
    const playbackRate = KeyFrequencyMap[note]/KeyFrequencyMap['C4'];
    this.source.playbackRate.value = playbackRate;

    this.source.connect(this.ac_.destination);
    this.source.loop = true;
    this.source.loopStart = .5;
    this.source.loopEnd = .6;
    this.source.start(.5);
  }
  stop() {
    this.source.stop(0);
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
}

// Handles which piano key was pressed, calling appropriate start/stop fns
class Piano {
  constructor(element, ac, notesPlayer) {
    this.ac_ = ac;
    this.notesPlayer_ = notesPlayer;
    this.eventListenerMap = new Map();
    this.element_ = element;

    this.bindEventHandlers();
  }
  bindEventHandlers() {
    this.element_.addEventListener('mousedown', (ev) => this.onNoteStart(ev));
    this.element_.addEventListener('touchstart', (ev) => this.onNoteStart(ev));
  }
  onNoteStart({target}) {
    const {dataset} = target;
    this.ac_.resume().then(() => {
      this.notesPlayer_.play(dataset.note);

      const noteStopHandler = this.onNoteStop.bind(this);
      this.eventListenerMap.set(target, noteStopHandler);
      target.addEventListener('mouseup', noteStopHandler);
      target.addEventListener('mouseleave', noteStopHandler);
    });
  }
  onNoteStop({target}) {
    const {dataset} = target;
    this.notesPlayer_.stop();
    const noteStopHandler = this.eventListenerMap.get(target);

    target.removeEventListener('mouseup', noteStopHandler);
    target.removeEventListener('mouseleave', noteStopHandler);
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
