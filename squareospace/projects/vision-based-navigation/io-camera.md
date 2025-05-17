
Between 2021 and 2023, I've had substantial end-to-end ownership in the development of a high-performance space-grade camera with edge processing capability enabled by:
- _PolarFire_ SoC (_RISC-V_ processor + _Microsemi_ FPGA)
- high quantum efficienct COTS detector (CMOS type)
- radiation-tolerant PCB design, resilient to high-TID/SEU/SEL radiation environments
- optical baffle and radiation-shielded optics

The camera can operate as:
- low-power **star tracker**, and optionally enabling detection/tracking/identification of resident space objects (i.e. other satellites or space debris)
- **angles-only navigation** sensor, combining onboard image processing with Unscented Kalman Filtering, to achieve relative orbit determination (i.e. estimating 6 orbital DoF of an object from a sequence of monocular 2-DoF bearing angles measurements)
- **6-DoF pose estimation** sensor (i.e. attitude + position) for close proximity operations — except for terminal rendezvous — enabled by FPGA-based acceleration of convolutional neural networks
<figure>
  <img src="img/camera_and_LRF_assembled.jpg" alt="camera and LRF" style="width:85%">
  <figcaption>
    <div style="width:85%">
      Proximity navigation camera / star tracker (right) and laser range finder (left)
    </div>
  </figcaption>
</figure>

My cross-functional role led me to work across **hardware**, **software**, **simulation** and **testing**, in particular:
- developed most of the star tracking software, integrated it into an autocodable ``Simulink`` simulator, and generated ``C``-code flight software
- developed entire image processing pipeline for angles-only navigation, integrated and tuned Kalman filters for orbit determination, auto-coded integrated software stack deployed on flight hardware
- validated star tracking & navigation algorithms via synthetic image generation
- designed and built optical testbed for optics alignment and HIL testing
- high fidelity radiometric simulations
- developed online calibration algorithm for star tracker (estimates 8 distortion parameters via star patterns)
- night sky testing planning and post-processing
- developed ``Orekit``-based flight dynamics software
- AIV/AIT support, requirements management, PM, procurement, documentation
- trained AI models (``PyTorch``) and generated synthetic image datasets.

<div style="display: flex; justify-content: space-between; align-items: center; gap: 5px; flex-wrap: wrap;">
  <figure style="width: 56%; margin: 0; display: flex; flex-direction: column; align-items: center;">
    <img src="img/camera_calibration_testbed.jpg" alt="camera and optical testbed" style="width: 100%; height: auto;">
    <figcaption style="text-align: center;">Engineering model of the camera on optical testbed</figcaption>
  </figure>

  <figure style="width: 42%; margin: 0; display: flex; flex-direction: column; align-items: center;">
    <img src="img/ST_night_sky_testing.jpg" alt="night sky testing" style="width: 100%; height: auto;">
    <figcaption style="text-align: center;">Tripod-mounted camera during night sky testing campaign</figcaption>
  </figure>
</div>