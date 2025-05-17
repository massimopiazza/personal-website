Validation of CNN-based algorithms across the domain gap — between synthetic-only image datasets used for training and the real image domain — required extensive use of a robotic testbed, which also enables hardware-in-the-loop testing of the full GNC loop used in a close proximity rendezvous scenario between two spacecraft.

My role focused on integrating, calibrationg and operating a robotic testbed consisting of:
- two **6-DoF UR10e robotic arms** (both mounted on a rail which provides the 7th DoF), which allows emulating the 6D relative dynamics between two space object during a rendezvous trajectory
- **motion capture** system for ground truth labeling via infrared retro-reflective markers
- control architecture based on the **``ROS`` middleware**
- sun emulator

<figure>
  <video controls width="85%">
    <source src="videos/SnT_robotic_testbed.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
  <figcaption>
    <div style="width:85%">
      Robotic testbed for validation dataset acquisition and hardware-in-the-loop testing (random sampling of the pose space)
    </div>
  </figcaption>
</figure>