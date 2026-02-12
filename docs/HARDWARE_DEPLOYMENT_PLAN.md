# The Machine: Distributed Hardware Deployment Plan

**Concept:** A decentralized, physical extension of The Machine into the real world.
**Goal:** Ubiquitous presence. The system should not just be "on the phone" but "in the environment," capable of local processing, sensing, and communication even when internet connectivity is spotty.

---

## 🏗️ Architecture: The "God Eye" Mesh

The architecture mimics a distributed sensor network. Central processing happens at the **Home Core**, while specialized **Nodes** extend reach into vehicles, offices, and mobile carry-alls.

### 1. The Core (The Server Farm)
*   **Location:** Secure Home Closet / Basement.
*   **Hardware:** Mac Mini M2 / High-end PC with NVIDIA GPU.
*   **Role:** Heavy lifting (LLM inference, Voice Training, Master Database).
*   **Connectivity:** Tailscale Subnet Router.

### 2. The Nodes (Raspberry Pi Fleet)

#### A. The "Watcher" Nodes (Static - Office / Home Rooms)
*   **Hardware:** Raspberry Pi 5 (8GB RAM).
*   **Role:** Local "Edge" Intelligence.
    *   Runs a lightweight whisper model for voice detection (wake word).
    *   Hosts a local dashboard display (touchscreen).
*   **Peripherals:** Camera (Face recognition/presence detection), Microphone array (Respeaker).

#### B. The "Rover" Nodes (Vehicle / Mobile Bag)
*   **Hardware:** Raspberry Pi Zero 2 W or Pi 4 (Low power).
*   **Role:** Data collection & Travel Beacon.
    *   GPS tracking (passive logging of routes).
    *   "Dashcam" functionality (automated plate scanning - *legal check required*).
    *   Local Wi-Fi Hotspot for family devices during travel.
*   **Power:** UPS HAT + Anker PowerCore 26800mAh (or hardwired to car 12V).

#### C. The "Analog Interface" (User Mobile Devices)
*   **Hardware:** Existing Smartphones.
*   **Role:** The primary input/output surface.
    *   The phone connects to the nearest "Node" or the "Core" via VPN.
    *   Notifications and Voice Output happen here.

---

## 🌐 Connectivity: The Nervous System

To make this seamless, all devices must feel like they are on the same local network, regardless of physical location.

1.  **Tailscale (Mesh VPN):**
    *   Install Tailscale on EVERY device (Pi, Phone, Server).
    *   This creates a flat, secure network. The car Pi can talk to the home DB as if it were on the couch.
2.  **Syncthing / PouchDB (Data Sync):**
    *   *Offline First:* Rover nodes must cache data (GPS logs, voice notes) when 4G is lost.
    *   When connectivity restores (Tailscale handshake), data syncs back to Core.

---

## 📦 Recommended Configuration

### Scenario 1: "The Portable Asset" (Bag Build)
*   **Case:** Rugged hard shell case (Pelican style).
*   **Core:** Raspberry Pi 4 (4GB).
*   **Network:** USB 4G/LTE Modem (Huawei E3372).
*   **Power:** PiSugar 3 Plus (Battery HAT).
*   **Function:**
    *   Portable "Safe Zone" Wi-Fi.
    *   Environment logging (Temperature, Humidity).
    *   Bluetooth beacon scanner (Who is near me?).

### Scenario 2: "The Interceptor" (Car Build)
*   **Installation:** Glovebox or Under Seat.
*   **Core:** Raspberry Pi 5 (Active Cooling).
*   **Power:** Hardwired 12V-to-5V converter (Ignition sense).
*   **Sensors:** GPS Module (USB), ODB-II Reader (Car health diagnostics).
*   **Function:**
    *   Logs every trip automatically.
    *   Alerts The Machine if car health metrics (battery voltage, engine codes) deviate.
    *   *Person of Interest Vibe:* If the car is started at 3 AM, The Machine wakes you up.

---

## 🔮 Scalability

| Device Count | Complexity | Management Tool |
|:---:|:---:|:---:|
| **1-3 Pis** | Low | Manual SSH / Scripts |
| **4-10 Pis** | Medium | Ansible Playbooks |
| **10+ Pis** | High | Kubernetes (K3s) on Edge |

*Recommendation:* Start with **Ansible**. Write a simple playbook (`site.yml`) that updates all Pis, installs the Tailscale daemon, and deploys your sensor scripts.

---

## ⚠️ "The Machine" Reality Check

While building a surveillance state in a box is fun:
1.  **Heat Management:** Pi 5s get HOT. Bag builds need ventilation.
2.  **Power Anxiety:** Mobile Pis drain batteries fast. Pi Zero 2 W is the king of battery life if you don't need heavy processing.
3.  **Data Costs:** 4G modems need SIM cards. Costs add up. Use "Store & Forward" (sync on home Wi-Fi) to save money.
