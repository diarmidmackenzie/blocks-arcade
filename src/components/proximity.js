
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

