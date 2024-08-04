// Scene jumping.
AFRAME.registerComponent('scene-jumps', {
  schema: {
    camera: {type: 'selector', default: "#camera"},
    positions: {type: 'array', default: ["0 0 0 0 0 0"]},
    foci: {type: 'array', default: ["a-scene"]}
  },

  init: function() {
    this.worldPosition = new THREE.Vector3();
    this.positions = [];
    this.foci = [];
    this.currentPosition = 0;
    this.keyListener = this.keydown.bind(this);
    this.data.positions.forEach((item) => {
      var config = item.split(" ")

      if (config.length !== 6) {
          console.log(`Bad sequence config: ${item}`)
      }

      // Store any provided foci.
      this.data.foci.forEach((item) => {
        this.foci.push(item);
      });

      // Now fill in positions.  This will fill in default values of
      // 'a-scene' for any unspceified positions.
      var position = {'x': parseFloat(config[0]),
                      'y': parseFloat(config[1]),
                      'z': parseFloat(config[2]),
                      'xr': parseFloat(config[3]),
                      'yr': parseFloat(config[4]),
                      'zr': parseFloat(config[5])};
      this.positions.push(position);
      if (this.positions.length > this.foci.length) {
        this.foci.push("a-scene");
      }
    });

    var url_string = window.location.href;
    var url = new URL(url_string);
    var startPosition = (url.searchParams.get("start") != undefined) ? url.searchParams.get("start") : 0;

    window.addEventListener('keydown', this.keyListener, false);
    this.setPosition(startPosition);
    this.setFocus(0, 0);
  },
  tick: function (time, timeDelta) {
    this.uselessState = 0;
  },

  keydown: function (event) {
    switch (event.code) {
      case "Minus":
        this.jump(-1);
        break;

      case "Equal":
        this.jump(1);
        break;

      case "Digit0":
      case "Digit1":
      case "Digit2":
      case "Digit3":
      case "Digit4":
      case "Digit5":
      case "Digit6":
      case "Digit7":
      case "Digit8":
      case "Digit9":
          var prevPosition = this.currentPosition;
          this.currentPosition = (event.code.charCodeAt(5) - "0".charCodeAt(0));
          if (this.currentPosition >= this.positions.length) {
            this.currentPosition = 0;
          }
          this.setPosition(this.currentPosition);
          this.setFocus(this.currentPosition, prevPosition);
          break;
    }
  },

  jump: function(direction) {

    var prevPosition = this.currentPosition;

    this.currentPosition += direction;
    if (this.currentPosition >= this.positions.length) {
      this.currentPosition = 0;
    }
    if (this.currentPosition < 0) {
      this.currentPosition = this.positions.length - 1;
    }
    this.setPosition(this.currentPosition);
    this.setFocus(this.currentPosition, prevPosition);
  },

  setPosition: function(index) {

    this.el.object3D.position.x = this.positions[index].x;
    this.el.object3D.position.y = this.positions[index].y;
    this.el.object3D.position.z = this.positions[index].z;

    // Recenter camera: overwrite look-controls pitch & yaw objects.
    // It wuld be nice if look-controls had an official interface to do this
    // but it doesn't.  So we just dig into the internals & set them...
    this.data.camera.components['look-controls'].pitchObject.rotation.x = 0;
    this.data.camera.components['look-controls'].pitchObject.rotation.y = 0;
    this.data.camera.components['look-controls'].pitchObject.rotation.z = 0;
    this.data.camera.components['look-controls'].yawObject.rotation.x = 0;
    this.data.camera.components['look-controls'].yawObject.rotation.y = 0;
    this.data.camera.components['look-controls'].yawObject.rotation.z = 0;

    this.el.object3D.rotation.x = this.positions[index].xr * Math.PI / 180;
    this.el.object3D.rotation.y = this.positions[index].yr * Math.PI / 180;
    this.el.object3D.rotation.z = this.positions[index].zr * Math.PI / 180;

  },

  setFocus: function(index, prevIndex) {

    // Trigger a defocus message on the previous entity.
    var element = document.querySelector(this.foci[prevIndex])
    element.emit("defocus");

    // Find the new entity, trigger a focus message on it.
    element = document.querySelector(this.foci[index])
    element.emit("focus");
  }
});

