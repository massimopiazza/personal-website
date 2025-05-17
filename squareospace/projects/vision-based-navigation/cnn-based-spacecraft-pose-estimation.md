I first approached the problem of autonomous spacecraft vision-based navigation in 2020, as part of my master thesis research at [Polimi](https://www.polimi.it/en/). My initial work focused on developing and training deep learning-based pipelines for onboard pose estimation of a spacecraft.

At [Infinite Orbits](https://www.infiniteorbits.io), I later went on to tackle a number of adjacent problems, including:
- high-fidelity **synthetic image generation**, obtained by integrating *Blender* and *Unreal Engine* rendering pipelines with a ``Matlab/Simulink`` GNC simulator
- **Kalman filtering** to leverage sequnce data and improve robustness of raw CNN-based estimates
- adapting AI models and other navigation algorithms for **deployment** on radiation tolerant space hardware, with the help of auto-coding tools and FPGA engineers
- integrating, calibrating and operating a two-**robot arm testbed** for hardware-in-the loop testing of vision-based proximity navigation on real imagery of a mockup satellite, and validation across domain gap when training on augmented synthetic datasets only

<figure>
  <video controls width="85%">
    <source src="videos/PoseEstimation_Tango_CNNandUKF.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
  <figcaption>
    <div style="width:85%">
      Demo of CNN-based pose estimation + Unscented Kalman Filtering pipeline, running on Blender-generated imagery
    </div>
  </figcaption>
</figure>