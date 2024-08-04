// Attention detector used to enable/disable controls based on attention.
// This combines distance and camera direction to pick out which of a list
// of possible targets currently has the player's attention.

AFRAME.registerComponent('attention', {
  schema: {
    targets: {type: 'array'},
    //fov: {type: 'number', default: 30},
    maxdistance: {type: 'number', default: 10},
    focusevent: {type: 'string', default: "focus"},
    defocusevent: {type: 'string', default: "defocus"},
    disableevent:  {type: 'string', default: "disableAttention"},
    enableevent:  {type: 'string', default: "enableAttention"},
    axes: {type: 'string', default: "XYZ"}
  },

  init: function() {
    // The tick function calculations for attention are quite intensive.
    // 5 times a second is plenty for attention/focus.
    this.tick = AFRAME.utils.throttleTick(this.tick, 200, this);

    this.targetWorldPosition = new THREE.Vector3();
    this.cameraWorldPosition = new THREE.Vector3();
    this.vectorToTarget = new THREE.Vector3();
    this.cameraDirectionVector = new THREE.Vector3();
    this.attention = false;
    this.fovAngle = this.data.fov * Math.PI / 180;
    this.cameraQuaternion = new THREE.Quaternion();
    this.targets = [];
    this.attentionTarget = null;
    this.disabled = false;
    this.listeners = {
      'disable' : this.disable.bind(this),
      'enable' : this.enable.bind(this)
    }
  },

  update: function () {
    // Indicate that targets list need rebuilding.
    // Don't build yet as update is too early at start of day, relative
    // to creation of target objects.
    this.gotTargets = false;

    this.el.addEventListener(this.data.disableevent, this.listeners.disable);
    this.el.addEventListener(this.data.enableevent, this.listeners.enable);
  },

  disable: function () {

    this.disabled = true;

    // fire defocus event for whatever has current focus.
    if (this.attentionTarget !== null) {
      this.attentionTarget.emit(this.data.defocusevent);
      this.attentionTarget = null;
    }
  },

  enable: function () {
    this.disabled = false;
  },

  tick: function (time, timeDelta) {

    if (this.disabled) return;

    if (!this.gotTargets) {
      this.data.targets.forEach(item => {
        var target = document.querySelector(item);
        this.targets.push(target);
      });
      this.gotTargets = true;
    }

    var bestScore = 0;
    var bestTarget;

    this.getCameraInfo();

    this.targets.forEach(item => {
      var score = this.getTargetScore(item);

      if (score > bestScore) {
        bestTarget = item;
        bestScore = score;
      }
    });

    if (this.attentionTarget !== bestTarget) {
      // change of attention.
      if (this.attentionTarget !== null) {
        this.attentionTarget.emit(this.data.defocusevent);
      }
      bestTarget.emit(this.data.focusevent);
      this.attentionTarget = bestTarget;
    }
  },

  // Sets up this.cameraWorldPosition and this.cameraDirectionVector
  // for use in getTargetScore.
  // (we only need to do this once, even if checking many targets).
  getCameraInfo: function () {

    // Camera Position stuff
    var camera = this.el;
    camera.object3D.updateMatrixWorld();
    this.cameraWorldPosition.setFromMatrixPosition(camera.object3D.matrixWorld);

    // Camera Rotation stuff.
    this.cameraQuaternion.setFromRotationMatrix(camera.object3D.matrixWorld)
    this.cameraDirectionVector.set(0,0,-1);
    this.cameraDirectionVector.applyQuaternion(this.cameraQuaternion);
    this.zeroUnusedVectorAxes(this.cameraDirectionVector);
  },

  getTargetScore: function (target) {

    target.object3D.getWorldPosition(this.targetWorldPosition);

    this.vectorToTarget.subVectors(this.targetWorldPosition,
                                   this.cameraWorldPosition);
    this.zeroUnusedVectorAxes(this.vectorToTarget);

    var distance = this.vectorToTarget.length();
    var angle = 1;

    if (distance < this.data.maxdistance) {
      // Within range: check angles.

      angle = this.vectorToTarget.angleTo(this.cameraDirectionVector);

      // if angle > 45 degrees, set angle so high it is impossible to match.
      if (angle > (Math.PI / 4)) {
        angle = 1000;
      }
    }

    // scoring system that weights small angles, and small distances as both
    // good.  Max score is 10.
    var score = 1/(distance + (5 * Math.abs(angle)) + 0.1);

    return(score);
  },

  zeroUnusedVectorAxes: function(vector) {
    if (!this.data.axes.includes("X")) {
      vector.x = 0;
    }
    if (!this.data.axes.includes("Y")) {
      vector.y = 0;
    }
    if (!this.data.axes.includes("Z")) {
      vector.z = 0;
    }
  }
});
