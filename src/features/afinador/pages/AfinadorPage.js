const A4 = 440;
const CLARITY_THRESHOLD = 0.9;
const MIN_RMS = 0.012;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const TUNINGS = {
  6: [
    { id: 'E2', label: 'E', description: '6a corda', frequency: 82.41 },
    { id: 'A2', label: 'A', description: '5a corda', frequency: 110 },
    { id: 'D3', label: 'D', description: '4a corda', frequency: 146.83 },
    { id: 'G3', label: 'G', description: '3a corda', frequency: 196 },
    { id: 'B3', label: 'B', description: '2a corda', frequency: 246.94 },
    { id: 'E4', label: 'E', description: '1a corda', frequency: 329.63 },
  ],
  12: [
    { id: 'E2', label: 'E grave', description: '6o par', frequency: 82.41 },
    { id: 'E3', label: 'E oitava', description: '6o par', frequency: 164.81 },
    { id: 'A2', label: 'A grave', description: '5o par', frequency: 110 },
    { id: 'A3', label: 'A oitava', description: '5o par', frequency: 220 },
    { id: 'D3', label: 'D grave', description: '4o par', frequency: 146.83 },
    { id: 'D4', label: 'D oitava', description: '4o par', frequency: 293.66 },
    { id: 'G3', label: 'G grave', description: '3o par', frequency: 196 },
    { id: 'G4', label: 'G oitava', description: '3o par', frequency: 392 },
    { id: 'B3a', label: 'B', description: '2o par', frequency: 246.94 },
    { id: 'B3b', label: 'B dupla', description: '2o par', frequency: 246.94 },
    { id: 'E4a', label: 'E', description: '1o par', frequency: 329.63 },
    { id: 'E4b', label: 'E dupla', description: '1o par', frequency: 329.63 },
  ],
};

export function AfinadorPage() {
  const page = document.createElement('section');
  page.className = 'page tuner-page';
  page.innerHTML = `
    <header class="dashboard-header tuner-header">
      <div>
        <span class="dashboard-kicker">Violao</span>
        <h1>Afinador</h1>
        <p>Afinador cromatico para violao de 6 ou 12 cordas usando o microfone do dispositivo.</p>
      </div>
      <div class="dashboard-summary">
        <span data-role="tuner-state">Parado</span>
      </div>
    </header>

    <section class="tuner-panel">
      <div class="tuner-controls">
        <label>
          Instrumento
          <select data-field="instrument">
            <option value="6">Violao 6 cordas</option>
            <option value="12">Violao 12 cordas</option>
          </select>
        </label>
        <label>
          Corda alvo
          <select data-field="target"></select>
        </label>
        <button class="button-link" type="button" data-action="toggle-tuner">Iniciar afinador</button>
      </div>

      <div class="tuner-meter" data-state="idle">
        <div class="tuner-note">
          <span data-role="target-note">--</span>
          <strong data-role="cents">0</strong>
        </div>
        <div class="tuner-scale" aria-hidden="true">
          <span>-50</span>
          <span>-25</span>
          <span>0</span>
          <span>+25</span>
          <span>+50</span>
          <i data-role="needle"></i>
        </div>
        <p data-role="hint">Toque uma corda por vez, de preferencia perto do microfone.</p>
      </div>

      <div class="tuner-readout">
        <span>Detectado <strong data-role="frequency">-- Hz</strong></span>
        <span>Alvo <strong data-role="target-frequency">-- Hz</strong></span>
        <span>Nota <strong data-role="detected-note">--</strong></span>
      </div>
    </section>
  `;

  const stateLabel = page.querySelector('[data-role="tuner-state"]');
  const instrumentInput = page.querySelector('[data-field="instrument"]');
  const targetInput = page.querySelector('[data-field="target"]');
  const toggleButton = page.querySelector('[data-action="toggle-tuner"]');
  const meter = page.querySelector('.tuner-meter');
  const targetNote = page.querySelector('[data-role="target-note"]');
  const centsLabel = page.querySelector('[data-role="cents"]');
  const needle = page.querySelector('[data-role="needle"]');
  const hint = page.querySelector('[data-role="hint"]');
  const frequencyLabel = page.querySelector('[data-role="frequency"]');
  const targetFrequencyLabel = page.querySelector('[data-role="target-frequency"]');
  const detectedNoteLabel = page.querySelector('[data-role="detected-note"]');

  const tuner = {
    audioContext: null,
    analyser: null,
    source: null,
    stream: null,
    frameId: null,
    buffer: null,
    running: false,
  };

  function renderTargets() {
    const strings = getCurrentTuning();
    targetInput.innerHTML = `
      <option value="auto">Automatico</option>
      ${strings.map((string) => (
        `<option value="${string.id}">${string.label} - ${string.description} (${formatFrequency(string.frequency)})</option>`
      )).join('')}
    `;
    updateTargetReadout(null);
  }

  async function toggleTuner() {
    if (tuner.running) {
      stopTuner();
      return;
    }

    await startTuner();
  }

  async function startTuner() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Microfone indisponivel neste navegador.', 'error');
        return;
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      tuner.audioContext = new AudioContext();
      tuner.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      tuner.source = tuner.audioContext.createMediaStreamSource(tuner.stream);
      tuner.analyser = tuner.audioContext.createAnalyser();
      tuner.analyser.fftSize = 4096;
      tuner.buffer = new Float32Array(tuner.analyser.fftSize);
      tuner.source.connect(tuner.analyser);
      tuner.running = true;
      toggleButton.textContent = 'Parar afinador';
      setStatus('Ouvindo', 'listening');
      tick();
    } catch (error) {
      stopTuner();
      setStatus(error?.name === 'NotAllowedError'
        ? 'Permissao do microfone negada.'
        : 'Nao foi possivel iniciar o microfone.', 'error');
    }
  }

  function stopTuner() {
    tuner.running = false;
    if (tuner.frameId) window.cancelAnimationFrame(tuner.frameId);
    tuner.frameId = null;
    tuner.stream?.getTracks().forEach((track) => track.stop());
    tuner.audioContext?.close?.();
    tuner.audioContext = null;
    tuner.analyser = null;
    tuner.source = null;
    tuner.stream = null;
    toggleButton.textContent = 'Iniciar afinador';
    setStatus('Parado', 'idle');
  }

  function tick() {
    if (!tuner.running || !tuner.analyser || !tuner.buffer) return;

    tuner.analyser.getFloatTimeDomainData(tuner.buffer);
    const pitch = detectPitch(tuner.buffer, tuner.audioContext.sampleRate);

    if (!pitch) {
      updatePitchReadout(null);
      tuner.frameId = window.requestAnimationFrame(tick);
      return;
    }

    const target = getTargetForFrequency(pitch.frequency);
    const cents = getCents(pitch.frequency, target.frequency);
    updatePitchReadout({ pitch, target, cents });
    tuner.frameId = window.requestAnimationFrame(tick);
  }

  function updatePitchReadout(data) {
    if (!data) {
      needle.style.left = '50%';
      targetNote.textContent = '--';
      centsLabel.textContent = '0';
      frequencyLabel.textContent = '-- Hz';
      detectedNoteLabel.textContent = '--';
      hint.textContent = 'Toque uma corda por vez, de preferencia perto do microfone.';
      meter.dataset.state = tuner.running ? 'quiet' : 'idle';
      return;
    }

    const clampedCents = Math.max(-50, Math.min(50, data.cents));
    needle.style.left = `${50 + clampedCents}%`;
    targetNote.textContent = data.target.label;
    centsLabel.textContent = `${data.cents > 0 ? '+' : ''}${Math.round(data.cents)} cents`;
    frequencyLabel.textContent = formatFrequency(data.pitch.frequency);
    targetFrequencyLabel.textContent = formatFrequency(data.target.frequency);
    detectedNoteLabel.textContent = frequencyToNoteName(data.pitch.frequency);

    if (Math.abs(data.cents) <= 4) {
      hint.textContent = 'Afinada';
      meter.dataset.state = 'tuned';
    } else if (data.cents < 0) {
      hint.textContent = 'Aperte a corda: esta baixa.';
      meter.dataset.state = 'flat';
    } else {
      hint.textContent = 'Afrouxe a corda: esta alta.';
      meter.dataset.state = 'sharp';
    }
  }

  function updateTargetReadout(target) {
    const nextTarget = target || getCurrentTuning()[0];
    targetFrequencyLabel.textContent = formatFrequency(nextTarget.frequency);
  }

  function setStatus(message, status) {
    stateLabel.textContent = message;
    meter.dataset.state = status;
    if (status === 'idle') updatePitchReadout(null);
  }

  function getCurrentTuning() {
    return TUNINGS[instrumentInput.value] || TUNINGS[6];
  }

  function getTargetForFrequency(frequency) {
    const selected = targetInput.value;
    const strings = getCurrentTuning();
    if (selected !== 'auto') {
      return strings.find((string) => string.id === selected) || strings[0];
    }

    return strings.reduce((best, string) => (
      Math.abs(getCents(frequency, string.frequency)) < Math.abs(getCents(frequency, best.frequency))
        ? string
        : best
    ), strings[0]);
  }

  function getSelectedTarget() {
    const strings = getCurrentTuning();
    if (targetInput.value === 'auto') return strings[0];

    return strings.find((string) => string.id === targetInput.value) || strings[0];
  }

  instrumentInput.addEventListener('change', renderTargets);
  targetInput.addEventListener('change', () => updateTargetReadout(getSelectedTarget()));
  toggleButton.addEventListener('click', toggleTuner);
  page.addEventListener('master-cifras:destroy', stopTuner);

  renderTargets();
  return page;
}

function detectPitch(buffer, sampleRate) {
  const rms = Math.sqrt(buffer.reduce((sum, value) => sum + value * value, 0) / buffer.length);
  if (rms < MIN_RMS) return null;

  let start = 0;
  let end = buffer.length - 1;
  const threshold = 0.2;

  while (start < buffer.length / 2 && Math.abs(buffer[start]) < threshold) start += 1;
  while (end > buffer.length / 2 && Math.abs(buffer[end]) < threshold) end -= 1;

  const sliced = buffer.slice(start, end);
  if (sliced.length < 32) return null;

  const correlations = new Float32Array(sliced.length);
  for (let lag = 0; lag < sliced.length; lag += 1) {
    let correlation = 0;
    for (let index = 0; index < sliced.length - lag; index += 1) {
      correlation += sliced[index] * sliced[index + lag];
    }
    correlations[lag] = correlation;
  }

  let peak = -1;
  let peakValue = 0;
  let foundDip = false;

  for (let lag = 1; lag < correlations.length; lag += 1) {
    if (correlations[lag] < correlations[lag - 1]) {
      foundDip = true;
    } else if (foundDip && correlations[lag] > peakValue) {
      peak = lag;
      peakValue = correlations[lag];
    }
  }

  if (peak <= 0 || peakValue / correlations[0] < CLARITY_THRESHOLD) return null;

  const shift = interpolatePeak(correlations, peak);
  return { frequency: sampleRate / (peak + shift), clarity: peakValue / correlations[0] };
}

function interpolatePeak(correlations, peak) {
  const previous = correlations[peak - 1] || 0;
  const current = correlations[peak] || 0;
  const next = correlations[peak + 1] || 0;
  const divisor = previous - 2 * current + next;

  return divisor ? (previous - next) / (2 * divisor) : 0;
}

function getCents(frequency, targetFrequency) {
  return 1200 * Math.log2(frequency / targetFrequency);
}

function frequencyToNoteName(frequency) {
  const midi = Math.round(69 + 12 * Math.log2(frequency / A4));
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

function formatFrequency(value) {
  return `${Number(value).toFixed(2)} Hz`;
}
