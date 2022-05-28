# Overview

This repository contains our final project code for EE 267: Virtual Reality. In this project, we add onto the virtual environment we built in our assignments by providing 3D audio. We do so by taking advantage of open-source [Head-Related Transfer Functions](https://en.wikipedia.org/wiki/Head-related_transfer_function).

## Running our code

To run our code, you will need the VR kit provided by the EE 267 staff. This kit includes a ViewMaster head-mounted display and the VRduino. 

Start by cloning our repository: `git clone https://github.com/rshiv2/3d-audio.git`

The VRduino records head orientation via IMU. First open up `vrduino/vrduino.ino` in the teensyduino IDE and upload the code to the Teensy. The Teensy will start recording and streaming IMU data. To access the IMU data, open up a WebSocket on your computer:

1. `cd server`
2. `npm install`
3. `node server.js`

Then open a second server on your computer. You will use this second server to see the virtual environment:
`python3 -m http.server 8080`. Navigate to your browser and open `localhost:8080`. 

Music should start playing automatically, and will emanate from the teapot in the virtual environment.

## References

- R. Sridhar and E. Choueiri. The 3D3A Lab Head-Related Transfer Function Database. 3D3A Lab Technical Report #3

## Authors
Kevin Tan (github: kevtan, email: tankevin@stanford.edu)
Rahul Shiv (github: rshiv2, email: rshiv2@stanford.edu)
