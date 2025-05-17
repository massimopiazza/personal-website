### Vision-Based Autonomous Navigation System for Satellites  
(Patent family headed by [FR3129737B1](https://patents.google.com/patent/FR3129737B1/en))
<br><br>

**What it solves:**  
Conventional proximity-operations in orbit rely on ground control and bulky active sensors (LiDAR / radar). The patent proposes an alternatice on-board, monocular vision-only architecture that enables autonomous perception, guidance, and control of the "chaser" satellite. In particular the system:  

- acquires grayscale monocular images continuously
- runs far-range image processing to detect/identifie other space objects, and estimates their relative orbits via Unscented Kalman Filter and linearised orbital dynamics
- once a target comes within a close proximity range, **near-range processing** estimates the target’s pose (position + attitude)
- calculates rendezvous guidance onboard and estimates collision probability
- issues real-time commands to the satellite’s attitude control & propulsion subsystems, to enable inspection, servicing, life-extension or debris removal operations
<br>

**Why it’s novel:**  
- Vision-only: low-SWaP solution compared to LiDAR/radar
- Fully autonomous, i.e. no ground-in-the-loop
- Broad range of use cases, from GEO life extension to inspection or debris removal
<br><br>

---
| Jurisdiction            | Publication Nº                                                   | Key dates                           | Patent status                                     |
|:------------------------|:-----------------------------------------------------------------|:------------------------------------|:-------------------------------------------------|
| **France**              | [FR3129737B1](https://patents.google.com/patent/FR3129737B1/en)  | Filed 26 Nov 2021<br>(Granted 24 Nov 2023) | **Granted & active** (expires 26 Nov 2041)      |
| **United States**       | [US2025/0026499A1](https://patents.google.com/patent/US20250026499A1/en) | Published 23 Jan 2025               | **Pending** (under USPTO examination)            |
| **Europe (EPO)**        | [EP4436878A1](https://patents.google.com/patent/EP4436878A1/en) | Published 2 Oct 2024                | **Pending** (search opinion issued; examination request expected) |
| **International (PCT)** | [WO2023/094347A1](https://patents.google.com/patent/WO2023094347A1/en) | Published 1 Jun 2023                | **PCT completed**                                |
---
<br>

#### Inventors & Assignee:  
Emmanuel Koumandakis · Marco Nedungadi · Akshay Gulati · Massimo Piazza · Adrian Aguinaga — _Infinite Orbits, SAS_