// Simple proximity detector
AFRAME.registerComponent('proximity', {
  schema: {
    target:   {type: 'string', default: "#rhand"},
    distance: {type: 'number', default: 0.1},
    start:    {type: 'string', default: "nearby"},
    end:      {type: 'string', default: "distant"},
    maxrate:  {type: 'number', default: 1000},
    axes:     {type: 'string', default: "XYZ"}
  },

  init: function() {
    this.targetWorldPosition = new THREE.Vector3();
    this.myWorldPosition = new THREE.Vector3();
    this.nearby = false;
    if (this.el.attributes.camera) {
      this.elementIsCamera = true;
    }
    else {
      this.elementIsCamera = false;
    }

  },

  update: function () {
    this.target = document.querySelector(this.data.target);
    if (this.target.attributes.camera) {
      this.targetIsCamera = true;
    }
    else {
      this.targetIsCamera = false;
    }

    this.lastEmitted = 0;
  },

  // Note that getWorldPositon() does not return an accurate position for the
  // camera.
  // Alternative solution taken from here:
  // https://github.com/mrdoob/three.js/issues/18448#issuecomment-577339080
  tick: function (time, timeDelta) {
    if (this.targetIsCamera) {
      this.target.object3D.updateMatrixWorld();
      this.targetWorldPosition.setFromMatrixPosition(this.target.object3D.matrixWorld);
    }
    else {
      this.target.object3D.getWorldPosition(this.targetWorldPosition);
    }

    if (this.elementIsCamera) {
      this.el.object3D.updateMatrixWorld();
      this.myWorldPosition.setFromMatrixPosition(this.el.object3D.matrixWorld);
    }
    else {
      this.el.object3D.getWorldPosition(this.myWorldPosition);
    }

    if (!this.data.axes.includes("X")) {
      this.targetWorldPosition.x = this.myWorldPosition.x;
    }
    if (!this.data.axes.includes("Y")) {
      this.targetWorldPosition.y = this.myWorldPosition.y;
    }
    if (!this.data.axes.includes("Z")) {
      this.targetWorldPosition.z = this.myWorldPosition.z;
    }

    var distance = this.myWorldPosition.distanceTo(this.targetWorldPosition);
    if (distance < this.data.distance) {
      if ((!this.nearby) && (time - this.lastEmitted > this.data.maxrate)) {
        // just detected proximity, and not thrashing.
        this.el.emit(this.data.start);
        this.lastEmitted = time;
        this.nearby = true;
      }
    }
    else {
      if ((this.nearby) && (time - this.lastEmitted > this.data.maxrate)) {
        // just detected a move away, and not thrashing.
        this.el.emit(this.data.end);
        this.lastEmitted = time;
        this.nearby = false;
      }
    }
  }
});

// Usage example:
// this-inspector__1="field:focus;logger:#camera-logger;component:tetrisgame",
// this-inspector__2="field:listeners.focus;logger:#camera-logger2;component:tetrisgame"

AFRAME.registerComponent('this-inspector', {
  multiple: true,
  schema: {
    component: {type: 'string'},
    field: {type: 'string'},
    logger: {type: 'string'}
  },
  init: function() {
    this.logger = document.querySelector(this.data.logger);
    this.parameters = this.data.field.split(".");
    this.values = []
  },

  tick: function (time, timeDelta) {

    var value = this.data.component + "." + this.data.field + "=" +
                this.getValue(this.parameters.length - 1);

    this.logger.setAttribute('text', "value: " + value);
  },

  getValue: function(index) {
    if (index < 0) {
      return(this.el.components[this.data.component]);
    }
    return(this.getValue(index - 1)[this.parameters[index]]);
  }
});

AFRAME.registerComponent('dualtext', {

  schema: {
    vrtext: {type: 'string'},
    desktoptext: {type: 'string'}
  },
  init: function () {
    this.vr = false;
    this.listeners = {
      'enterVR' : this.enterVR.bind(this),
      'exitVR' : this.exitVR.bind(this)
    }
  },
  update: function() {
    var sceneEl = document.querySelector('a-scene');
    this.vr = sceneEl.is('vr-mode');
    if (sceneEl.is('vr-mode')) {
      this.el.setAttribute('text', "value: " + this.data.vrtext);
    }
    else {
      this.el.setAttribute('text', "value: " + this.data.desktoptext);
    }

    sceneEl.addEventListener("enter-vr", this.listeners.enterVR);
    sceneEl.addEventListener("exit-vr", this.listeners.exitVR);
  },

  enterVR: function () {
    this.update();
    this.vr = true;
  },

  exitVR: function () {
    this.update();
    this.vr = false;
  }

});


/* This is experimental function where controls are enabled/disabled
* based on direction of view.
* it is dependent on the "attention" component.
* Not clear whether this is a good mechanism, and whether we should maintain
* it.  Proximity-based solutions are probably simpler */

/* After some more effort, couldn't get this to work.
* Added ability to exclude y axis from proximity measurement, and used that
*/
// Simple attention detecor.
// used to enable/disable controls based on attention.
// this assumes the "rotation" of the object (e.g. a camera) represents its
// attention.
AFRAME.registerComponent('attention', {
  schema: {
    target: {type: 'string'},
    camera: {type: 'string', default: "#camera"},
    fov: {type: 'number', default: 30},
    focusevent: {type: 'string', default: "focus"},
    defocusevent: {type: 'string', default: "defocus"},
    axes: {type: 'string', default: "XYZ"}
  },

  init: function() {
    this.targetWorldPosition = new THREE.Vector3();
    this.cameraWorldPosition = new THREE.Vector3();
    this.vectorToTarget = new THREE.Vector3();
    this.cameraDirectionVector = new THREE.Vector3();
    this.attention = false;
    this.fovAngle = this.data.fov * Math.PI / 360;
  },

  update: function () {
    this.target = document.querySelector(this.data.target);
    this.lastEmitted = 0;
  },

  tick: function (time, timeDelta) {
    this.target.object3D.getWorldPosition(this.targetWorldPosition);

    var camera = document.querySelector(this.data.camera)
    camera.object3D.getWorldPosition(this.cameraWorldPosition);
    this.vectorToTarget.subVectors(this.targetWorldPosition,
                                   this.cameraWorldPosition);
    this.cameraDirectionVector.set(0,0,1);
    this.cameraDirectionVector.applyEuler(camera.object3D.rotation);

    // Overwrite camera data with target object data for any axes we
    // are configured to not care about.
    if (!this.data.axes.includes("X")) {
      this.cameraDirectionVector.x = this.vectorToTarget.x;
    }
    if (!this.data.axes.includes("Y")) {
      this.cameraDirectionVector.y = this.vectorToTarget.y;
    }
    if (!this.data.axes.includes("Z")) {
      this.cameraDirectionVector.z = this.vectorToTarget.z;
    }

    var angle = this.vectorToTarget.angleTo(this.cameraDirectionVector);

    if (angle < this.fovAngle) {
      // The element is outside the configured FoV.
      if (!this.attention) {
        // change of attention
        this.attention = true;
        this.el.emit(this.data.focusevent);
      }
    }
    else {
      // The element is outside the configured FoV.
      if (this.attention) {
        // change of attention
        this.attention = false;
        this.el.emit(this.data.defocusevent);
      }
    }
  }
});
/* End experimental function */

// Scene jumping.
AFRAME.registerComponent('scene-jumps', {
  schema: {
    positions: {type: 'array', default: ["0 0 0 0 0 0"]},
    foci: {type: 'array', default: ["a-scene"]}
  },

  init: function() {
    this.worldPosition = new THREE.Vector3();
    this.positions = [];
    this.foci = [];
    this.currentPosition = 0;
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
      this.jumpListener = this.jump.bind(this);
    });

    this.el.addEventListener("jump", this.jumpListener);
    this.setPosition(0);
    this.setFocus(0, 0);
  },

  jump: function() {

    var prevPosition= this.currentPosition;

    this.currentPosition++;
    if (this.currentPosition >= this.positions.length) {
      this.currentPosition = 0;
    }
    this.setPosition(this.currentPosition);

    this.setFocus(this.currentPosition, prevPosition);
  },

  setPosition: function(index) {

    this.el.object3D.position.x = this.positions[index].x;
    this.el.object3D.position.y = this.positions[index].y;
    this.el.object3D.position.z = this.positions[index].z;
    this.el.object3D.rotation.x = this.positions[index].xr * Math.PI / 180;
    this.el.object3D.rotation.y = this.positions[index].yr * Math.PI / 180;
    this.el.object3D.rotation.z = this.positions[index].zr * Math.PI / 180;
  },

  jumpPosition: function() {

    this.currentPosition++;
    if (this.currentPosition >= this.positions.length) {
      this.currentPosition = 0;
    }
    this.setPosition(this.currentPosition);
  },

  setFocus: function(index, prevIndex) {

    // Trigger a defocus message on the previous entity.
    element = document.querySelector(this.foci[prevIndex])
    element.emit("defocus");

    // Find the new entity, trigger a focus message on it.
    element = document.querySelector(this.foci[index])
    element.emit("focus");
  }
});
