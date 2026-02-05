I first approached the problem of autonomous spacecraft vision-based navigation in 2020, as part of my master's thesis research at [Polimi](https://www.polimi.it/en/). My initial work focused on developing and training deep learning-based pipelines for onboard pose estimation of a spacecraft.

At [Infinite Orbits](https://www.infiniteorbits.io), I later went on to tackle a number of adjacent problems, including:
- high-fidelity **synthetic image generation**, obtained by integrating `Blender` and `Unreal Engine` rendering pipelines with a `Matlab/Simulink` GNC simulator
- CNN **training** (via `PyTorch`) of object detection, segmentation and keypoint regression models
- **Kalman filtering** to leverage sequence data and improve robustness of raw CNN-based estimates
- adapting AI models and other navigation algorithms for **deployment** on radiation-tolerant space hardware, with the help of auto-coding tools (`C/C++`) and FPGA engineers (`VHDL`, Xilinx `Vivado`)
- integrating, calibrating and operating a two-**robot arm testbed** for hardware-in-the loop testing of vision-based proximity navigation on real imagery of a mockup satellite, and validating performance across the domain gap when training on augmented synthetic datasets only

<figure>
  <video controls width="85%">
    <source src="videos/PoseEstimation_Tango_CNNandUKF.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
  <figcaption>
    <div style="width:85%">
      Demo of CNN-based pose estimation + Unscented Kalman Filtering pipeline, running on Blender-generated imagery
      <citation-link n="1" href="https://iac2022-iaf.ipostersessions.com/default.aspx?s=06-8E-09-44-37-08-A5-FE-86-E3-7D-83-D5-B0-54-D9"></citation-link>
    </div>
  </figcaption>
</figure>