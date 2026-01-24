# The Machine: Voice Interface Implementation Plan

**Target Voice:** Amy Acker (Root / The Analog Interface)
**Goal:** Implement a self-hosted, offline-first Text-to-Speech (TTS) system that gives "The Machine" its iconic voice, fully integrated with the Homebase architecture.

---

## 🏗️ Architecture

To maintain the project's "Privacy" and "Self-Hosted" core values, the voice system must run locally without external APIs (like ElevenLabs or OpenAI).

### Component Stack
1.  **Inference Engine:** [Coqui TTS](https://github.com/coqui-ai/TTS) (specifically **XTTS v2**) or [RVC](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI) (Retrieval-based Voice Conversion) layered over a base TTS.
    *   *Recommendation:* **XTTS v2** is currently the state-of-the-art for few-shot voice cloning and text-to-speech in a single package. It supports emotive speech and requires minimal samples (though more is better).
2.  **Service Layer:** A dedicated Python microservice (FastAPI) running in a Docker container.
    *   Exposes a POST endpoint: `/api/speak { text: string }`
    *   Returns: `audio/wav` stream.
3.  **Hardware Acceleration:** CUDA (NVIDIA GPU) is highly recommended for real-time synthesis. CPU-only inference will likely have significant latency.

---

## 🛠️ Implementation Steps

### Phase 1: Data Collection & Model Preparation
*Objective: Create a high-quality voice model.*

1.  **Source Material Gathering**:
    *   Collect high-quality, noise-free audio samples of Amy Acker.
    *   *Ideal Sources:* Audiobooks narrated by her, podcast interviews, or clean dialogue stems from Person of Interest (specifically "Root" monologues for that specific cadence).
    *   *Quantity:* 1-5 minutes of clean audio is sufficient for XTTS v2; 10-30 minutes for a full RVC training.
2.  **Preprocessing**:
    *   Split audio into 3-10 second chunks.
    *   Normalize volume.
    *   Remove background noise/music (using tools like `UVR5` - Ultimate Vocal Remover).
3.  **Training/Fine-tuning**:
    *   **Option A (Easier):** Use XTTS v2 with a reference audio clip at runtime (Zero-shot).
    *   **Option B (Better Quality):** Fine-tune a GPT-SoVITS or XTTS model specifically on the dataset.

### Phase 2: Backend Integration
*Objective: Create the "Voice of the Machine" service.*

1.  Create a `docker-compose` service `voice-engine`.
2.  Implement a FastAPI wrapper around the inference model.
3.  Ensure the container has access to GPU resources (`nvidia-container-toolkit`).

```yaml
# docker-compose.yml example
services:
  voice-engine:
    image: ghcr.io/coqui-ai/tts:latest
    ports:
      - "5002:5002"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    volumes:
      - ./models:/root/.local/share/tts
```

### Phase 3: Frontend Integration
*Objective: Connect the UI to the Voice.*

1.  **Audio Player Component**: Create `src/components/TheMachineVoice.tsx`.
    *   Hidden audio element or visualizer.
    *   Queue system to handle streaming chunks of text from the LLM.
2.  **Interaction Flow**:
    *   User inputs text/voice -> Local LLM (Ollama) processes -> Text Stream Output.
    *   Text Stream -> Sent to `voice-engine` in sentences.
    *   Audio Stream -> Played to user.

### Phase 4: "The Analog Interface" Mode
*Objective: Mimic the UX of Root communicating with The Machine.*

*   ** cochlear implant mode**: If using mobile PWA, allow background audio playback for "always on" guidance.
*   **Urgency Interrupts**: Allow the system to push audio notifications ("Can you hear me? We have a problem.") for critical alerts.

### Alternative: The "Patchwork" Voice (Pre-S5E5)
*Objective: Simulate the original "cut-and-paste" voice of The Machine, stitched together from thousands of surveillance clips.*

This approach is legally safer (if using public domain audio) and aesthetically distinct, though more technically complex to make intelligible.

**Technical Approach: Modern Concatenative Synthesis**

1.  **Phoneme/Word Bank Generation**:
    *   Instead of training a single coherent model, create a database of ~100 distinct voices reading common words and phonemes.
    *   *Data Source:* Use datasets like `LibriSpeech` or `Common Voice` to get thousands of different speakers.
    *   *Processing:* Force-align transcripts to audio to slice perfectly at word/phoneme boundaries.
2.  **Selection Algorithm**:
    *   When synthesizing a sentence (e.g., "Admin access required"), the engine selects each word from a *different* speaker in the database.
    *   *Heuristic:* Prioritize rapid shifts in pitch, gender, and background noise to maximize the "surveillance collage" effect.
3.  **DSP "Glitch" Chain**:
    *   Apply micro-fades (10ms) between clips to avoid clicking, but *do not* smooth the transition. The harsh cut is the desired aesthetic.
    *   Add mild background static or tape hiss that persists across the cuts to glue them together.

**Implementation Tools**:
*   **MFA (Montreal Forced Aligner)**: To slice audio clips precisely by word.
*   **Python (Pydub/Librosa)**: To stitch the selected clips together dynamically.

---

## ⚖️ Ethical & Legal Considerations

*   **Personal Use Only**: Cloning a celebrity's voice (Amy Acker) falls under complex legal territory. This implementation must remain strictly **local** and for **personal/private use** within your own home.
*   **Distribution**: You cannot distribute the trained model weights or the dataset. The code can be shared, but users must provide their own audio samples.
*   **Consent**: In a real-world commercial product, explicit consent would be required.

---

## 📋 Prerequisites checklist

- [ ] NVIDIA GPU with at least 8GB VRAM (recommended for decent speed).
- [ ] 10-15 clean wav files of the target voice.
- [ ] Docker & Nvidia Container Toolkit installed.
