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
    if (this.data.logger !== "")
    {
      this.logger = document.querySelector(this.data.logger);
    }
    else {
      // Create logger at a HUD position attached to the camera.
      var camera = document.querySelector('a-scene').camera.el;
      this.logger = document.createElement('a-text');
      this.logger.setAttribute('id', "this-logger")
      this.logger.setAttribute('position', "-1 0 -2")
      camera.appendChild(this.logger);
    }

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
  },

  update: function () {
    // Indicate that targets list need rebuilding.
    // Don't build yet as update is too early at start of day, relative
    // to creation of target objects.
    this.gotTargets = false;

  },

  tick: function (time, timeDelta) {

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
      score = this.getTargetScore(item);

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

    window.addEventListener('keydown', this.keyListener, false);
    this.setPosition(0);
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
    element = document.querySelector(this.foci[prevIndex])
    element.emit("defocus");

    // Find the new entity, trigger a focus message on it.
    element = document.querySelector(this.foci[index])
    element.emit("focus");
  }
});

const TETRIS_BLOCK_SIZE = 0.1;
const TETRIS_BLOCK_LIBRARY = {
  '2DTetris' : "EEE,EEU,EED,EUE,EDE,EUDE,EUW",
  '3DTetris' : "EEE,EEN,ENE,ENSE,ENW,ENSU,ENU",
  '2DPentris': "EEEE,EEEU,EEED,EEUE,EEDE,EEUDE,EEDUE,EEDD,EEDW,EEUW,EEWDD,EDED,EDEWD,WDWED,EUDDUE,DEEU,DEED,UEEU",
  '3DPentris': "EEEE,EEES,EESE,EESS,EESW,EEWSS,ESES,ESEWS,EUDDUE,SEEN,SEES,EESU,EESD,EEWSD,ESEU,ESED,ESEWU,ESEWD",
  '2DPentrisEasy': "EEEE,EEEU,EEED,EEUE,EEDE,EEUDE,EEDUE,EEDW,EEUW,DEEU",
  '3D1BlockMulticolor' : ",,,,,,",
  '3D1Block1color' : "",
  '3D3BlockMulticolor' : "EE,EE,EE,EE,EE,EE,EE"
}
const TETRIS_KEYS_LIBRARY = {
  '2D': `KeyZ=xminus,KeyX=xplus,Enter=zRotMinus,ShiftRight=zRotPlus,Space=$drop,
         #rhand.abuttondown=$drop,#rhand.abuttonup=%drop,
         #rhand.triggerdown=$drop,#rhand.triggerup=%drop,
         #lhand.xbuttondown=$drop,#lhand.xbuttonup=%drop`,
  '3D': `KeyG=xminus,KeyJ=xplus,KeyY=zminus,KeyH=zplus,
         Numpad8=xRotMinus,Numpad5=xRotPlus,Numpad4=yRotPlus,Numpad6=yRotMinus,
         Numpad7=zRotMinus,Numpad9=zRotPlus,
         Space=$drop,#rhand.abuttondown=$drop,#rhand.abuttonup=%drop,
         #rhand.triggerdown=$drop,#rhand.triggerup=%drop,
         #lhand.xbuttondown=$drop,#lhand.xbuttonup=%drop`,
  'DropOnly': `Space=$drop,#rhand.abuttondown=$drop,#rhand.abuttonup=%drop,
               #rhand.triggerdown=$drop,#rhand.triggerup=%drop,
               #lhand.xbuttondown=$drop,#lhand.xbuttonup=%drop`
}

const TETRIS_BLOCK_COLORS = [
  "yellow",
  "blue",
  "white",
  "magenta",
  "cyan",
  "green",
  "red",
  "#888888",
  "#FF8800",
  "#FF0088",
  "#88FF00",
  "#00FF88",
  "#8800FF",
  "#0088FF",
  "#FF8888",
  "#88FF88",
  "#8888FF",
  "#88FFFF",
  "#FFFF88",
  "#FF88FF"
]

const TETRIS_CONTROLS_DESKTOP = {
  '2D': `Enter to start\n\nMove L/R: Z & X\n\nRotate: R-Shift/Enter\n\nSpace to drop`,
  '3D': `Enter to start\n\nMove in the horizontal plane: YGHJ\n\nRotations:\nYaw: 4/6\nPitch: 5/8\nRoll:7/9\n\nSpace to drop`
}

const TETRIS_CONTROLS_VR = {
  '2D': `B or Right Trigger to start\n\nMove: Left Thumbstick\n\nRotate: Right Thumbstick or\nRight Grip & turn\n\nA, X or Right Trigger to drop`,
  '3D': `B or Right Trigger to start\n\nMove: Left Thumbstick\n\nRotate: Right Thumbstick or\nRight Grip & turn\n\nA, X or Right Trigger to drop`
}

AFRAME.registerComponent('tetris-machine', {
  schema: {
    id:       {type: 'string'},
    shapeset: {type: 'string'},
    label:    {type: 'string'},
    xsize:    {type: 'number'},
    zsize:    {type: 'number'},
    gameh:    {type: 'number', default: 16},
    baseh:    {type: 'number', default: 0.5},
    xspace:   {type: 'number', default: 0},
    zspace:   {type: 'number', default: 0},
    xledge:   {type: 'number', default: 1},
    zledge:   {type: 'number', default: 1},
    description: {type: 'string'},
    gametype: {type:'string'},
    hiscoreid: {type: 'string'},
    levelspeedup: {type: 'number', default: 10},
    clear: {type: 'string', default: "layer"},
    tutorial: {type: 'boolean', default: false},
    fill: {type: 'number', default: 0}
  },

  init: function() {
    // almost everything is done in init.  We don't support updates.

    // ALl objects are created with posiiton 0, 0, 0, as children of this
    // element.  The overall system can then be re-positioned or re-oriented
    // by just moving the parent object.

    // However, we offset most pieces (not the shape dropper) by half a block
    // where the play-space dimensions are even.
    this.xoffset = ((1 - (this.data.xsize % 2)) * TETRIS_BLOCK_SIZE)/2;
    this.zoffset = ((1 - (this.data.zsize % 2)) * TETRIS_BLOCK_SIZE)/2;
    this.glassWidth = (this.data.xsize + 2 * (this.data.xspace)) * TETRIS_BLOCK_SIZE
    this.glassDepth = (this.data.zsize + 2 * (this.data.zspace)) * TETRIS_BLOCK_SIZE

    this.standWidth = this.glassWidth + (this.data.xledge * TETRIS_BLOCK_SIZE);
    this.standDepth = this.glassDepth + (this.data. zledge * TETRIS_BLOCK_SIZE);

    // Gametype is "2D" or "3D"
    if (!this.data.gametype) {
      this.gametype = this.data.shapeset.substring(0,2)
    }
    else {
      this.gametype = this.data.gametype
    }

    this.createArena();
    this.createShapeGenerator();
    this.createGameStart();
    this.createScoreboard();
    this.createHelpText();
    if (this.data.fill > 0) {
      this.fillArena();
    }
  },

  fillArena: function() {

    var arena = document.querySelector(`#arena${this.data.id}`);

    for (var ii = 1; ii <= this.data.xsize; ii++) {
      for (var jj = 1; jj <= this.data.zsize; jj++) {
        for (var kk = 0; kk < this.data.gameh; kk++) {

          const color = Math.floor(Math.random() * this.data.fill);
          const x = Math.floor(ii - this.data.xsize/2) * TETRIS_BLOCK_SIZE;
          const y = TETRIS_BLOCK_SIZE * kk + TETRIS_BLOCK_SIZE/2;
          const z = Math.floor(jj - this.data.zsize/2) * TETRIS_BLOCK_SIZE;
          this.createBlock(arena, x, y, z, color);
        }
      }
    }
  },

  createBlock: function (arena, x, y, z, color) {
    var entityEl = document.createElement('a-entity');

    entityEl.setAttribute("mixin", `arena${this.data.id}-mixin${color}`);
    entityEl.setAttribute("class", "blockarena" + this.data.id);
    entityEl.object3D.position.x = x;
    entityEl.object3D.position.y = y;
    entityEl.object3D.position.z = z;
    arena.appendChild(entityEl);
  },

  createArena: function() {

    // create the arena.  Not visible, so don't care about dimensions, just
    // position.
    var entityEl = document.createElement('a-entity');
    entityEl.setAttribute("id", "arena" + this.data.id);
    entityEl.setAttribute("arena", `x:${this.data.xsize};z:${this.data.zsize};clear:${this.data.clear}`);
    entityEl.setAttribute("position", `0 ${this.data.baseh} 0`);
    this.el.appendChild(entityEl);

    // In this same position, we create an InstancedMesh, and Arena Mixin for
    // each block color that can land in the arena.
    // We set a bounding sphere for frustrum culling at the limit of the arena
    // space.
    const fccenter = `0 ${this.data.baseh + (this.data.gameh * TETRIS_BLOCK_SIZE)/2} 0`
    const fcradius = Math.sqrt(this.data.xsize * this.data.xsize +
                               this.data.zsize * this.data.zsize +
                               this.data.gameh * this.data.gameh) * TETRIS_BLOCK_SIZE;

    const colors = TETRIS_BLOCK_LIBRARY[this.data.shapeset].match(/,/g).length + 1;
    for (var ii = 0; ii < colors; ii++) {
      entityEl = document.createElement('a-entity');
      entityEl.setAttribute("id", `arena${this.data.id}-mesh${ii}`);
      entityEl.setAttribute("position", `0 ${this.data.baseh} 0`);
      entityEl.setAttribute("framed-block", `facecolor: ${TETRIS_BLOCK_COLORS[ii]}; framecolor: black`);
      entityEl.setAttribute("instanced-mesh",
                            `capacity: ${(this.data.xsize * this.data.zsize * this.data.gameh)};
                             fccenter:${fccenter};
                             fcradius:${fcradius}`);
      this.el.appendChild(entityEl);

      entityEl = document.createElement('a-mixin');
      entityEl.setAttribute("id", `arena${this.data.id}-mixin${ii}`);
      entityEl.setAttribute("instanced-mesh-member", `mesh:#arena${this.data.id}-mesh${ii};debug:true`);
      entityEl.setAttribute("scale", "0.05 0.05 0.05");
      this.el.appendChild(entityEl);
    }
    // Create the stand.
    entityEl = document.createElement('a-entity');
    entityEl.setAttribute("id", "stand" + this.data.id);
    //entityEl.setAttribute("attention", `target:#stand${this.data.id};camera:#camera;axes:XZ;start:focus;end:defocus`);
    entityEl.setAttribute("shadow", "receive:true");
    entityEl.setAttribute("framed-block",
                          `facecolor: black;
                          framecolor: #444444;
                          width: ${this.standWidth};
                          height:${this.data.baseh};
                          depth: ${this.standDepth};
                          frame: 0.05`);
    entityEl.setAttribute("position", `${this.xoffset} ${this.data.baseh/2} ${this.zoffset}`);
    entityEl.setAttribute("event-set__focus1", `_event: focus;_target:#stand-focus${this.data.id}; visible:true`);
    entityEl.setAttribute("event-set__focus2", `_event: focus;_target:#stand${this.data.id}; visible:false`);
    entityEl.setAttribute("event-set__defocus1", `_event: defocus;_target:#stand-focus${this.data.id}; visible:false`);
    entityEl.setAttribute("event-set__defocus2", `_event: defocus;_target:#stand${this.data.id}; visible:true`);

    if (!this.data.tutorial) {
      entityEl.setAttribute("event-set__focus3", `_event: focus;_target:#top-focus${this.data.id}; visible:true`);
      entityEl.setAttribute("event-set__focus4", `_event: focus;_target:#top${this.data.id}; visible:false`);
      entityEl.setAttribute("event-set__defocus3", `_event: defocus;_target:#top-focus${this.data.id}; visible:false`);
      entityEl.setAttribute("event-set__defocus4", `_event: defocus;_target:#top${this.data.id}; visible:true`);
    }
    this.el.appendChild(entityEl);

    // And a second (invisible) stand, white rather than grey edging.  Switched in to show focus.
    entityEl = document.createElement('a-entity');
    entityEl.setAttribute("id", "stand-focus" + this.data.id);
    entityEl.setAttribute("shadow", "receive:true");
    entityEl.setAttribute("framed-block",
                          `facecolor: black;
                          framecolor: white;
                          width: ${this.standWidth};
                          height:${this.data.baseh};
                          depth: ${this.standDepth};
                          frame: 0.05`);
    entityEl.setAttribute("position", `${this.xoffset} ${this.data.baseh/2} ${this.zoffset}`);
    entityEl.setAttribute("visible", false);
    this.el.appendChild(entityEl);

    // Label on the stand...
    entityEl = document.createElement('a-text');
    entityEl.setAttribute("id", `label${this.data.id}`);
    entityEl.setAttribute("color", "white");
    entityEl.setAttribute("align", "center");
    entityEl.setAttribute("anchor", "center");
    entityEl.setAttribute("baseline", "center");
    entityEl.setAttribute("width", this.standWidth * 2);
    entityEl.setAttribute("position",
                          `${this.xoffset}
                           ${this.data.baseh/2}
                           ${this.zoffset + (this.standDepth/2)}`);
    entityEl.setAttribute("value", this.data.label);
    this.el.appendChild(entityEl);

    // Create a box at the top that mirrors the stand.  We don't have a focus effect for this one.
    if (!this.data.tutorial) {
      entityEl = document.createElement('a-entity');
      entityEl.setAttribute("id", "top" + this.data.id);
      entityEl.setAttribute("framed-block",
                            `facecolor: black;
                            framecolor: #444444;
                            width: ${this.standWidth};
                            height: 0.5;
                            depth: ${this.standDepth};
                            frame: 0.05`);
      entityEl.setAttribute("position", `${this.xoffset} ${this.data.baseh + (this.data.gameh * TETRIS_BLOCK_SIZE) + 0.25} ${this.zoffset}`);
      this.el.appendChild(entityEl);

      // And a second (invisible) stand, white rather than grey edging.  Switched in to show focus.
      entityEl = document.createElement('a-entity');
      entityEl.setAttribute("id", "top-focus" + this.data.id);
      entityEl.setAttribute("shadow", "receive:true");
      entityEl.setAttribute("framed-block",
                            `facecolor: black;
                            framecolor: white;
                            width: ${this.standWidth};
                            height: 0.5;
                            depth: ${this.standDepth};
                            frame: 0.05`);
      entityEl.setAttribute("position", `${this.xoffset} ${this.data.baseh + (this.data.gameh * TETRIS_BLOCK_SIZE) + 0.25} ${this.zoffset}`);
      entityEl.setAttribute("visible", false);
      this.el.appendChild(entityEl);
    }

    // Finally, the glass casing.

    entityEl = document.createElement('a-box');
    entityEl.setAttribute("mixin", "glass");
    entityEl.setAttribute("height", 0.1 * this.data.gameh);
    entityEl.setAttribute("width", this.glassWidth + 0.002);
    entityEl.setAttribute("depth", this.glassDepth + 0.002);
    entityEl.setAttribute("position", `${this.xoffset}
                    ${this.data.baseh + (this.data.gameh * TETRIS_BLOCK_SIZE)/2}
                    ${this.zoffset}`);
    this.el.appendChild(entityEl);

  },

  createShapeGenerator: function() {

    var entityEl = document.createElement('a-entity');
    entityEl.setAttribute("id", `shapegen${this.data.id}`);

    var shapeGenString = `arena:#arena${this.data.id};`
    shapeGenString += `shapes:${TETRIS_BLOCK_LIBRARY[this.data.shapeset]};`
    shapeGenString += `keys:${TETRIS_KEYS_LIBRARY[this.gametype]};`
    shapeGenString += "movecontrol: #lhand.thumbstick;"
    shapeGenString += "rotatecontrol: #rhand.thumbstick,#rhand.grip;"
    if (!this.data.tutorial) {
      shapeGenString += `nextshape:#nextShapeContainer${this.data.id};`
    }
    shapeGenString += `pershapemixin:block;`
    shapeGenString += `arenapershapemixin:arena${this.data.id}-mixin;`
    shapeGenString += `tutorial:${this.data.tutorial}`


    entityEl.setAttribute("shapegenerator", shapeGenString);

    var shapegenheight = (this.data.gameh * TETRIS_BLOCK_SIZE)
    if (this.data.tutorial) {
      shapegenheight = (shapegenheight * 3)/4
    }
    entityEl.setAttribute("position",
              `0 ${this.data.baseh + shapegenheight} 0`);

    this.el.appendChild(entityEl);

    if (!this.data.tutorial) {
      // And the "next block" displayer...
      entityEl = document.createElement('a-entity');
      entityEl.setAttribute("id", `nextShapeContainer${this.data.id}`);
      entityEl.setAttribute("position",
               `-${this.glassWidth/2 + 0.5} ${this.data.baseh + (this.data.gameh * TETRIS_BLOCK_SIZE)} 0`);
      this.el.appendChild(entityEl);
    }
  },

  createGameStart: function() {

    // No geometry
    var tutorialParams = "";
    if (this.data.tutorial) {
      tutorialParams = "tutorial:true;"
    }
    var entityEl = document.createElement('a-entity');
    entityEl.setAttribute("id", `game${this.data.id}`);
    entityEl.setAttribute("tetrisgame",
                          `generator: #shapegen${this.data.id};
                          scoreboard: #scoreboard${this.data.id};
                          arena: #arena${this.data.id};
                          levelspeedup: ${this.data.levelspeedup};
                          focus:false;
                          ${tutorialParams}`);
    if (!this.data.tutorial)
    {
      entityEl.setAttribute("hi-score-logger",
                            `game:${this.data.hiscoreid};
                             table:#hiscores`)
    }
    entityEl.setAttribute("position", `${this.glassWidth/2 + 0.5} 0 0`);

    entityEl.setAttribute("key-bindings",
                          `bindings:Enter=start,
                           #rhand.bbuttondown=start,
                           #rhand.triggerdown=start,
                           #stand${this.data.id}.focus=focus,
                           #stand${this.data.id}.defocus=defocus`);

    entityEl.setAttribute("event-set__hide",
                      `_target:#help${this.data.id};
                       _event:started; visible:false`);
    entityEl.setAttribute("event-set__show",
                       `_target:#help${this.data.id};
                        _event:game-over; visible:true`);

    if (this.data.tutorial) {
      // Set visibility controls for tutorial text.
      entityEl.setAttribute("event-set__tthide",
                         `_target:#tutorialtextscreen;
                          _event:game-over; visible:false`);
      entityEl.setAttribute("event-set__ttshow",
                          `_target:#tutorialtextscreen;
                           _event:started; visible:true`);
    }

    this.el.appendChild(entityEl);

  },

  createScoreboard: function() {

    var entityEl = document.createElement('a-text');
    entityEl.setAttribute("id", `scoreboard${this.data.id}`);
    entityEl.setAttribute("width", "1.4");
    //entityEl.setAttribute("font", "sourcecodepro");
    entityEl.setAttribute("anchor", "center");
    entityEl.setAttribute("align", "left");
    entityEl.setAttribute("position",
                          `${this.xoffset + 0.5}
                           ${this.data.baseh + (this.data.gameh * TETRIS_BLOCK_SIZE) + 0.25}
                           ${this.zoffset + (this.standDepth /2) + 0.001}`);
    entityEl.setAttribute("value", "Time: 0:00\nLevel: 0\nScore: 0");
    entityEl.setAttribute("color", "white");
    if (this.data.tutorial) {
      entityEl.setAttribute("visible", "false");
    }

    this.el.appendChild(entityEl);

  },

  createHelpText: function() {

    var entityEl = document.createElement('a-text');
    entityEl.setAttribute("id", `help${this.data.id}`);
    entityEl.setAttribute("color", "white");
    entityEl.setAttribute("width", this.glassWidth - 0.1);
    entityEl.setAttribute("text", `wrapCount:${Math.floor(this.glassWidth * 25)}`);
    entityEl.setAttribute("position",
                          `${this.xoffset - (this.glassWidth *(2/5))}
                           ${this.data.baseh + (this.data.gameh * TETRIS_BLOCK_SIZE)/2}
                           ${this.zoffset + (this.glassDepth /2) + 0.001}`);
     if (!this.data.tutorial) {
      entityEl.setAttribute("dualtext",
                            `desktoptext:${this.data.description}\n\n\n${TETRIS_CONTROLS_DESKTOP[this.gametype]};
                             vrtext:${this.data.description}\n\n\n${TETRIS_CONTROLS_VR[this.gametype]}`);
    }
    else
    {
      entityEl.setAttribute("dualtext",
                            `desktoptext:Press Enter to start the tutorial;
                             vrtext:Press B or Right Trigger to start the tutorial`);
    }

    this.el.appendChild(entityEl);
  }

});

AFRAME.registerComponent('framed-block', {
schema: {
  height:     {type: 'number', default: 2},
  width:      {type: 'number', default: 2},
  depth:      {type: 'number', default: 2},
  frame:      {type: 'number', default: 0.2},
  framecolor: {type: 'color', default: '#000'},
  facecolor:  {type: 'color', default: '#AAA'}
},

/**
 * Initial creation and setting of the mesh.
 */
init: function () {
  var data = this.data;
  var el = this.el;

  // Create geometry.
  //this.geometry = new THREE.BoxBufferGeometry(data.width, data.height, data.depth);

  const BIGX = this.data.width / 2
  const BIGY = this.data.height / 2
  const BIGZ = this.data.depth / 2
  const SMALLX = this.data.width / 2 - this.data.frame
  const SMALLY = this.data.height / 2 - this.data.frame
  const SMALLZ = this.data.depth / 2 - this.data.frame

  this.geometry = new THREE.BufferGeometry();
  // Vertices - we have 3 vertices for each of the 8 corners of the cube.
  // Every vertex has two "small" components, and one big one.
  const vertices = new Float32Array( [
     SMALLX,  SMALLY,    BIGZ,
     SMALLX,    BIGY,  SMALLZ,
     BIGX,    SMALLY,  SMALLZ,

     SMALLX,  SMALLY,   -BIGZ,
     SMALLX,    BIGY, -SMALLZ,
     BIGX,    SMALLY, -SMALLZ,

     SMALLX, -SMALLY,    BIGZ,
     SMALLX,   -BIGY,  SMALLZ,
     BIGX,   -SMALLY,  SMALLZ,

     SMALLX, -SMALLY,   -BIGZ,
     SMALLX,   -BIGY, -SMALLZ,
     BIGX,   -SMALLY, -SMALLZ,

    -SMALLX,  SMALLY,    BIGZ,
    -SMALLX,    BIGY,  SMALLZ,
    -BIGX,    SMALLY,  SMALLZ,

    -SMALLX,  SMALLY,   -BIGZ,
    -SMALLX,    BIGY, -SMALLZ,
    -BIGX,    SMALLY, -SMALLZ,

    -SMALLX, -SMALLY,    BIGZ,
    -SMALLX,   -BIGY,  SMALLZ,
    -BIGX,   -SMALLY,  SMALLZ,

    -SMALLX, -SMALLY,   -BIGZ,
    -SMALLX,   -BIGY, -SMALLZ,
    -BIGX,   -SMALLY, -SMALLZ,
  ] );

  // itemSize = 3 because there are 3 values (components) per vertex
  this.geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

  // Now we define the faces in terms of vertex indices.
  const indices = []

  // 8 corner triangles.
  indices.push(0, 2, 1,
               3, 4, 5,
               6, 7, 8,
               9, 11, 10,
               12, 13, 14,
               15, 17, 16,
               18, 20, 19,
               21, 22, 23);

  // 12 edges.
  createRectangle(1, 2, 4, 5)
  createRectangle(0, 1, 12, 13)
  createRectangle(2, 0, 8, 6)
  createRectangle(4, 3, 16, 15)
  createRectangle(3, 5, 9, 11)
  createRectangle(7, 6, 19, 18)
  createRectangle(8, 7, 11, 10)
  createRectangle(9, 10, 21, 22)
  createRectangle(12, 14, 18, 20)
  createRectangle(14, 13, 17, 16)
  createRectangle(17, 15, 23, 21)
  createRectangle(19, 20, 22, 23)

  // 6 faces.
  createRectangle(6, 0, 18, 12)
  createRectangle(3, 9, 15, 21)
  createRectangle(1, 4, 13, 16)
  createRectangle(10, 7, 22, 19)
  createRectangle(5, 2, 11, 8)
  createRectangle(14, 17, 20, 23)

  function createRectangle(a, b, c, d) {
    indices.push(a, b, c);
    indices.push(c, b, d);
  }

  this.geometry.setIndex(indices);
  this.geometry.computeVertexNormals();

  // 8 + 2 x 12 = 32 triangles = 96 vertices for the "frame"
  this.geometry.addGroup(0, 96, 0 );
  // 2 x 6 = 12 triangles = 36 vertices for the faces.
  this.geometry.addGroup(96, 36, 1);

  // Create material.
  this.frameMaterial = new THREE.MeshStandardMaterial({color: data.framecolor, roughness: 0.3});
  this.faceMaterial = new THREE.MeshStandardMaterial({color: data.facecolor, roughness: 1.0});

  // Create mesh.
  this.mesh = new THREE.Mesh(this.geometry, [this.frameMaterial, this.faceMaterial]);

  // Set mesh on entity.
  el.setObject3D('mesh', this.mesh);
}
});

AFRAME.registerComponent('bevelled-tile', {
schema: {
  width:      {type: 'number', default: 2},
  depth:      {type: 'number', default: 2},
  frame:      {type: 'number', default: 0.2},
  framecolor: {type: 'color', default: '#000'},
  facecolor:  {type: 'color', default: '#AAA'}
},

/**
 * Initial creation and setting of the mesh.
 */
init: function () {
  var data = this.data;
  var el = this.el;

  const BIGX = this.data.width / 2;
  const BIGY = 0;
  const BIGZ = this.data.depth / 2;
  const SMALLX = this.data.width / 2 - this.data.frame;
  const SMALLY = -(this.data.frame);
  const SMALLZ = this.data.depth / 2 - this.data.frame;

  this.geometry = new THREE.BufferGeometry();
  // Vertices - we have 8 vertices, 2 at each corner.
  // 1-4 are the inner corners.
  // 5-8 are the outer (lower) corners
  const vertices = new Float32Array( [
     SMALLX,  BIGY, SMALLZ,
     SMALLX,  BIGY, -SMALLZ,
     -SMALLX, BIGY,  -SMALLZ,
     -SMALLX, BIGY,  SMALLZ,

     BIGX,  SMALLY, BIGZ,
     BIGX,  SMALLY, -BIGZ,
     -BIGX,  SMALLY, -BIGZ,
     -BIGX,  SMALLY, BIGZ,

  ] );

  // itemSize = 3 because there are 3 values (components) per vertex
  this.geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

  // Now we define the faces in terms of vertex indices.
  const indices = []

  // 4 bevelled edges.
  createRectangle(0, 4, 5, 1);
  createRectangle(1, 5, 6, 2);
  createRectangle(2, 6, 7, 3);
  createRectangle(3, 7, 4, 0);

  // 1 faces.
  createRectangle(0, 1, 2, 3)

  function createRectangle(a, b, c, d) {
    indices.push(a, b, c);
    indices.push(c, d, a);
  }

  this.geometry.setIndex(indices);
  this.geometry.computeVertexNormals();

  // 4 x 2 = 8 triangles = 24 vertices for the "frame"
  this.geometry.addGroup(0, 24, 0 );
  // 2 triangles = 6 vertices for the face.
  this.geometry.addGroup(24, 6, 1);

  // Create material.
  this.frameMaterial = new THREE.MeshStandardMaterial({color: data.framecolor, roughness: 0.3});
  this.faceMaterial = new THREE.MeshStandardMaterial({color: data.facecolor, roughness: 1.0});

  // Create mesh.
  this.mesh = new THREE.Mesh(this.geometry, [this.frameMaterial, this.faceMaterial]);

  // Set mesh on entity.
  el.setObject3D('mesh', this.mesh);
}
});



AFRAME.registerComponent('hi-scores-table', {
  schema: {
    url:   {type: 'string', default: "https://tetrisland.pythonanywhere.com/hiscores"},
    games:  {type: 'array', default: ""},
    names:  {type: 'array', default: ""},
    interval: {type: 'number', default: 10000},
    vrcontrols: {type: 'string', default: ""},
    keyboardcontrols: {type: 'string', default: ""}
  },

  init: function() {
    this.httpResponseFunction = this.dataCallback.bind(this);
    this.displayIndex = 0;
    this.inFocus = false;
    this.listeners = {
      focus: this.focus.bind(this),
      defocus: this.defocus.bind(this),
      next: this.next.bind(this),
      prev: this.prev.bind(this),
      gameover: this.gameover.bind(this),
    };
    this.sceneEl = document.querySelector('a-scene');
    this.jsonData = [];
    this.dataTimestamps = [];
    this.lastTickTime = 0;
    this.data.games.forEach(item => {
      this.jsonData.push("");
      this.dataTimestamps.push(-3600001);
    });
    this.queryIndex = 0;
    this.manualMove = false;
  },

  update: function() {

    if (this.lastTickTime - this.dataTimestamps[this.displayIndex] > 3600000)
    {
      // Data is over 60 mins old.  Refresh it.
      const gameId = this.data.games[this.displayIndex];
      const queryURL = `${this.data.url}/list?game=${gameId}&count=5`
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.onreadystatechange = this.httpResponseFunction;
      xmlHttp.open("GET", queryURL, true); // true for asynchronous
      xmlHttp.send(null);
      this.queryIndex = this.displayIndex;
    }
    else
    {
      this.presentData(this.jsonData[this.displayIndex]);
    }
  },

  play: function () {
    this.attachEventListeners();
  },

  pause: function () {
    this.removeEventListeners();
  },

  remove: function () {
    this.pause();
  },

  tick: function(time, timeDelta) {

    var last_time = time - timeDelta;
    var remainderNow = time % (this.data.interval);
    var lastRemainder = last_time % (this.data.interval);

    if (remainderNow < lastRemainder) {
      // We just crossed a time interval.  So move to the next scoreboard.
      // unless the player moved to this screen in the last interval, in
      // which case leave it for one more interval before advancing.
      if (!this.manualMove) {
        this.lastTickTime = time;
        this.displayIndex++;
        if (this.displayIndex >= this.data.games.length) {
          this.displayIndex = 0;
        }
        this.update();
      }
      else
      {
        this.manualMove = false;
      }
    }
  },
  dataCallback: function (event) {

    if (event.target.readyState == 4 && event.target.status == 200) {

      const jsonData = JSON.parse(event.target.responseText);

      if (this.queryIndex == this.displayIndex) {
        // We are still waiting to present this data.
          this.presentData(jsonData);
      }
      else
      {
        // User has requested a different page already.
        this.update();
      }

      // In any case, store off the data we collected as fresh data.
      this.jsonData[this.queryIndex] = jsonData;
      this.dataTimestamps[this.queryIndex] = this.lastTickTime;
    }
  },

  presentData: function(jsonData) {

    var text = (this.data.names[this.displayIndex] == "") ?
                               "This game" : this.data.names[this.displayIndex];
    text += " has been played:\n"
    text += `${jsonData['today']['plays']} times today\n`
    text += `${jsonData['month']['plays']} times this month\n`
    text += `${jsonData['alltime']['plays']} times in all time\n`

    text += "\n=== High Scores this Month ===\n"
    text += this.showHiScoreTable(jsonData['month']['hiscores']);
    text += "\n==== All Time High Scores ====\n"
    text += this.showHiScoreTable(jsonData['alltime']['hiscores']);
    text += `\n(${this.displayIndex + 1}/${this.data.games.length}) `;
    if (this.inFocus) {
      if (this.sceneEl.is('vr-mode')) {
        text += this.data.vrcontrols;
      }
      else
      {
        text += this.data.keyboardcontrols;
      }
    }

    this.el.setAttribute('text', "value: " + text);
  },

  showHiScoreTable: function(hiScoreData) {

    var text = ""
    if (hiScoreData.length > 0) {
        text += "Rank  Score  Level  Game Time\n"
        hiScoreData.forEach(function(item, index) {
          const score = item['score'].toString().padStart(5, " ")
          const level = item['level'].toString().padStart(5, " ")
          const mins = Math.floor(item['gametime'] / 60).toString().padStart(5, " ");
          const secs = (item['gametime'] % 60).toString().padStart('2', '0');

          text += `| ${(index + 1).toString().padStart('2', ' ')}  ${score}  ${level}  ${mins}:${secs} |\n`
        });
        for (var ii = hiScoreData.length ; ii < 5; ii++) {
          text += "\n"
        }
    }
    else
    {
      text += "No scores yet - be the first!\n\n\n\n\n\n"
    }
    return(text)
  },

  focus: function() {
    this.inFocus = true;

    this.presentData(this.jsonData[this.displayIndex]);
  },

  defocus: function() {
    this.inFocus = false;

    this.presentData(this.jsonData[this.displayIndex]);
  },

  next: function() {

    if (this.inFocus) {
      this.manualMove = true;
      this.displayIndex++;
      if (this.displayIndex >= this.data.games.length) {
        this.displayIndex = 0;
      }

      this.update();
    }
  },

  prev: function() {
    if (this.inFocus) {
      this.manualMove = true;
      this.displayIndex--;
      if (this.displayIndex < 0) {
        this.displayIndex = this.data.games.length - 1;
      }
      this.update();
    }
  },

  gameover: function(event) {

    var gameId = event.detail.gameId;
    var gameIndex = this.data.games.findIndex(x => (x == gameId));

    // Mark the data for this game as aged.
    this.dataTimestamps[gameIndex] = -3600001;

    // The query will happen next time this game's data is needed...
  },

  attachEventListeners: function () {

    this.el.addEventListener('focus', this.listeners.focus, false);
    this.el.addEventListener('defocus', this.listeners.defocus, false);
    this.el.addEventListener('next', this.listeners.next, false);
    this.el.addEventListener('prev', this.listeners.prev, false);
    this.el.addEventListener('gameover', this.listeners.gameover, false);
  },

  removeEventListeners: function () {

      this.el.removeEventListener('focus', this.listeners.focus);
      this.el.removeEventListener('defocus', this.listeners.defocus);
      this.el.removeEventListener('next', this.listeners.next);
      this.el.removeEventListener('prev', this.listeners.prev);
      this.el.removeEventListener('gemaover', this.listeners.gameover);
  }
});

AFRAME.registerComponent('hi-score-logger', {
  schema: {
    url:   {type: 'string', default: "https://tetrisland.pythonanywhere.com/hiscores"},
    game:  {type: 'string', default: ""},
    table: {type: 'selector', default: "#hiscores"}
  },

  init: function()
  {
    this.listeners = {
      'gameOver': this.gameOver.bind(this)
    }
    this.el.addEventListener("game-over", this.listeners.gameOver);
    this.sceneEl = document.querySelector('a-scene');
  },

  gameOver: function (event) {
    var isVR = (this.sceneEl.is('vr-mode')) ? 1 : 0;

    const data = {game: this.data.game,
                  score: event.detail.score,
                  level: event.detail.level,
                  gametime: event.detail.gametime,
                  vr: isVR};
    const jsonData = JSON.stringify(data);

    var request = new XMLHttpRequest();
    request.open('POST', this.data.url + "/submit" , true);
    request.setRequestHeader("Content-type", "application/json");
    request.send(jsonData);

    // Generate an event to the hi-score table to tell it to refresh.
    // (even if there's no high score, at least the games-played counter should
    // go up).
    this.data.table.emit("gameover", {gameId: this.data.game});
  }
});

AFRAME.registerComponent('tetris-tutorial', {
  schema: {
    id:       {type: 'string'},
    tutorialtext: {type: 'selector', default: "#tutorialtext"}
  },

  init: function() {
    var entityEl = document.createElement('a-entity');
    entityEl.setAttribute("tetris-machine",
                          `id: ${this.data.id};
                          label:Tutorial;
                          shapeset:3DTetris;
                          xsize:6;
                          zsize:6;
                          gameh:6;
                          tutorial:true`);
    this.el.appendChild(entityEl);

    this.listeners = {
      nextStep: this.nextStep.bind(this)
    }

    this.currentStep = -1;

    this.steps = [
      this.step1.bind(this),
      this.step2.bind(this),
      this.step3.bind(this),
      this.step4.bind(this),
      this.step5.bind(this),
      this.step6.bind(this),
      this.step7.bind(this),
      this.step8.bind(this),
      this.step9.bind(this),
      this.step10.bind(this)
    ]

    this.el.addEventListener('nextStep', this.listeners.nextStep, false);

    // Kick things off...
  },

  play: function () {
    // get some references to key elements... (these weren't necessarily
    // created at init/update time, so we grab them now.)
    this.arena = document.querySelector(`#arena${this.data.id}`);
    this._arena = this.arena.components.arena;
    this.generator = document.querySelector(`#shapegen${this.data.id}`);
    this._generator = this.generator.components.shapegenerator;
    this._generator.nextShapeChoice = 2;
  },

  nextStep: function() {

    this.currentStep +=1;
    if (this.currentStep >= this.steps.length) {
      this.currentStep = 0;
    }

    // invoke the function for the next step.
    this.steps[this.currentStep]();
  },

  step1: function () {

    this._arena.clearArena();

    // Set up Shape Generator with limited controls (no move/rotate).
    // Empty string results in default values being set, whereas an invalid
    // string like "none" gets us what we want.
    var shapeGenString = `keys:${TETRIS_KEYS_LIBRARY['DropOnly']};`
    shapeGenString += "movecontrol:none;"
    shapeGenString += "rotatecontrol:none;"
    this.generator.setAttribute("shapegenerator", shapeGenString);

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     Welcome to the Tetris Tutorial.
     When you start a game, shapes will fall into the play area.

     You need to position them to create complete layers of blocks.
     When a complete layer of blocks is filled in, it will disappear, recovering your play area, and increasing your score.

     Press Space to drop this block into the gap.;
     vrtext:
     Welcome to the Tetris Tutorial.
     When you start a game, shapes will fall into the play area.

     You need to position them to create complete layers of blocks.
     When a complete layer of blocks is filled in, it will disappear, recovering your play area, and increasing your score.

     Press A, X or Right Trigger to drop this block into the gap.`);
    this._generator.nextShapeChoice = 1;
    this._generator.generateShape(true);

    // Put some blocks in place to create
    // an almost-complete layer.
    this.createBlock(-0.1, 0.05, -0.1, 6);
    this.createBlock(0,    0.05, -0.1, 6);
    this.createBlock(0.1,  0.05, -0.1, 1);
    this.createBlock(0.2,  0.05, -0.1, 1);
    this.createBlock(0.2,  0.05,    0, 4);
    this.createBlock(0,    0.05,    0, 0);
    this.createBlock(0.1,  0.05,    0, 0);
    this.createBlock(0.2,  0.05,  0.1, 4);
    this.createBlock(-0.1, 0.05,  0.2, 1);
    this.createBlock(0,    0.05,  0.2, 1);
    this.createBlock(0.1,  0.05,  0.2, 1);
    this.createBlock(0.2,  0.05,  0.2, 2);


  },

  step2: function () {
    this._arena.clearArena();

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     There are lots of different games in this arcade.

     When you look at a nearby game, it becomes active, and the base lights up.  Try looking at another game, and then back at this one.

     Your controls will only affect the currently active game.

     When you're ready, press Space to drop the shape and move on.;

     vrtext:
     There are lots of different games in this arcade.

     When you look at a nearby game, it becomes active, and the base lights up.  Try looking at another game, and then back at this one.

     Your controls will only affect the currently active game.

     When you're ready, press A, X or Right Trigger to drop the shape and move on.`);

    this._generator.nextShapeChoice = 3;
    this._generator.generateShape(true);

  },

  step3: function () {

    this._arena.clearArena();

    // Set up Shape Generator back to normal settings.
    var shapeGenString = `keys:${TETRIS_KEYS_LIBRARY['3D']};`
    shapeGenString += "movecontrol: #lhand.thumbstick;"
    shapeGenString += "rotatecontrol: #rhand.thumbstick,#rhand.grip;"
    this.generator.setAttribute("shapegenerator", shapeGenString);

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     You can position shapes by moving them around horizontally.

     Use keys YGHJ (like WASD) to move this block around.

     Try it now!  When you've finished, press Space to drop the shape and move on.;
     vrtext:
     You can position shapes by moving them around horizontally.

     Use the left thumbstick to move this block around.

     Try it now!  When you've finished, press A, X or Right Trigger to drop the shape and move on.`);
    this._generator.nextShapeChoice = 0;
    this._generator.generateShape(true);

  },

  step4: function () {
    this._arena.clearArena();

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     You can also rotate shapes.

     When we are playing in 3D, there are 3 different ways that blocks can be rotated.

     To rotate the shape forwards or backwards (like nodding your head) use 5 & 8 on the number pad.

     Try it now!  When you've finished, press Space to drop the shape and move on.;
     vrtext:
     You can also rotate shapes.

     When we are playing in 3D, there are 3 different ways that blocks can be rotated.

     To rotate the shape forwards or backwards (like nodding your head) push the right thumbstick forwards or backwards.

     Try it now!  When you've finished, press A, X or Right Trigger to drop the shape and move on.`);
    this._generator.nextShapeChoice = 2;
    this._generator.generateShape(true);

  },

  step5: function () {
    this._arena.clearArena();

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     To roll the shape to the left or right (like tilting your head) use the 7 & 9 keys on the number pad.

     Try it now!  When you've finished, press Space to drop the shape and move on.;
     vrtext:
     To roll the shape to the left or right (like tilting your head) push the right thumbstick left or right.

     Try it now!  When you've finished, press A, X or Right Trigger to drop the shape and move on.`);
    this._generator.nextShapeChoice = 3;
    this._generator.generateShape(true);

  },


  step6: function () {
    this._arena.clearArena();

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     To turn the shape (like a turntable) use the 4 & 6 keys on the number pad.

     Try it now!  When you've finished, press Space to drop the shape and move on.;
     vrtext:
     You can also turn the shape (like a turntable).

     To do this, tilt the entire right controller 90 degrees to a horizontal position.  Now use the right thumbstick to turn the shape.

     Try it now!  When you've finished, press A, X or Right Trigger to drop the shape and move on.`);
    this._generator.nextShapeChoice = 5;
    this._generator.generateShape(true);

  },

  step7: function () {
    this._arena.clearArena();

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     As you can see, moving into 3D means we have some new shapes that don't appear in 2D Tetris.

     Try rotating this one to discover all the orientations that it can be put into.

     When you've finished, press Space to drop the shape and move on.;
     vrtext:
     As an alternative, you can rotate in any direction by holding down the grip button on the right controller, and rotating the entire controller in the same way that you want the shape to rotate.

     If you look at your hand, you'll see a shape appear that will help to guide your movements.

     Try it now!  When you've finished, press A, X or Right Trigger to drop the shape and move on.`);
    this._generator.nextShapeChoice = 6;
    this._generator.generateShape(true);

  },

  step8: function () {
    this._arena.clearArena();

    // Set up Shape Generator & Arena to 2D settings.
    var shapeGenString = `keys:${TETRIS_KEYS_LIBRARY['2D']};`
    shapeGenString += `shapes:${TETRIS_BLOCK_LIBRARY['2DTetris']};`
    this.generator.setAttribute("shapegenerator", shapeGenString);

    // Set up Shape Generator & Arena to 2D settings.
    // This can work on the arena, since it is clear (if it was not clear
    // that would cause all sorts of problems...)
    var arenaString = `z:1;`
    this.arena.setAttribute("arena", arenaString);

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     For 2D games, we use a different (simpler) set of controls.

     Use Z & X to move left and right, and R-Shift and Enter to rotate in either direction.

     Try it now!  When you've finished, press Space to drop the shape and move on.;
     vrtext:
     For 2D games, the controls are just the same, but you can only move blocks left and right, and roll the shapes left and right.

     Try it now!  When you've finished, press A, X or Right Trigger to drop the shape and move on.`);

    this._generator.nextShapeChoice = 2;
    this._generator.generateShape(true);

  },

  step9: function () {

    // Set up Shape Generator & Arena to 2D settings.
    var shapeGenString = `keys:${TETRIS_KEYS_LIBRARY['3D']};`
    shapeGenString += `shapes:${TETRIS_BLOCK_LIBRARY['3DTetris']};`
    this.generator.setAttribute("shapegenerator", shapeGenString);

    // Set Shape Generator & Arena back to 3D settings.
    var arenaString = `z:6;`
    this.arena.setAttribute("arena", arenaString);

    this._arena.clearArena();

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
    The controls are fixed relative to the play area.

    If you try playing from the side or back of the board, you may find the controls confusing.

    You'll find it easiest to stay in a fixed position in front of the play area.  Press keys 1-9 to jump straight to a good position for each game.

    When you are ready to start playing, press Space to drop the shape, and then pick a game to play.;
    vrtext:
    As you move around the play area, controls will adapt to your orientation, so you can play the game from any position.

    If you don't have enough physical space to move around, you can use the left trigger to teleport.

    Try it now!

    That's the end of the Tutorial.  When you have finished, press A, X or Right Trigger to drop the shape, and then choose a game to play.`);

    this._generator.nextShapeChoice = 2;
    this._generator.generateShape(true);
  },

  step10: function () {
    this._arena.clearArena();
    // Trigger "game over" to reset tutorial to base state.
    // Simplest way to do this is to declare arena full.  The game engine picks
    // this up & emits "game-over"
    this.arena.emit("arena-full");
  },

  createBlock(x, y, z, color) {
    var entityEl = document.createElement('a-entity');

    entityEl.setAttribute("mixin", `arena${this.data.id}-mixin${color}`);
    entityEl.setAttribute("class", "block" + this.arena.id);
    entityEl.object3D.position.x = x;
    entityEl.object3D.position.y = y;
    entityEl.object3D.position.z = z;
    this.arena.appendChild(entityEl);
  }

});

// This component only works for elements in the world reference.
// Only affects rotation about y axis, not x & z.
AFRAME.registerComponent('rotate-to-face-player', {

  schema : {
    camera: {type: 'selector', default: "#camera"}
  },

  tick: function() {
    this.trackCamera();
  },

  trackCamera: (function() {

    var vectorToCamera = new THREE.Vector3();
    var cylindrical = new THREE.Cylindrical();

    return function() {
      // Get Camera World Position.
      var camera = this.data.camera;
      camera.object3D.updateMatrixWorld();
      vectorToCamera.setFromMatrixPosition(camera.object3D.matrixWorld);

      vectorToCamera.sub(this.el.object3D.position);

      // Determine angle to camera, and set this rotation on the object.
      cylindrical.setFromVector3(vectorToCamera);
      this.el.object3D.rotation.y = cylindrical.theta;
    }
  })()
});

AFRAME.registerComponent('tetrisland-floor', {

  init: function () {
    TILES = 8
    TILE_SIZE = 1.5

    for (var ii = 0; ii < TILES; ii++) {
      for (var jj = 0; jj < TILES; jj++) {
        var entityEl = document.createElement('a-entity');
        entityEl.setAttribute("id", `floor${ii}${jj}`);
        entityEl.setAttribute("instanced-mesh-member", "mesh:#floor-mesh1");
        entityEl.object3D.position.x = (ii - TILES/2) * TILE_SIZE + TILE_SIZE/2;
        entityEl.object3D.position.y = 0;
        entityEl.object3D.position.z = (jj - TILES/2) * TILE_SIZE + TILE_SIZE/2;

        this.el.appendChild(entityEl);
      }
    }
  }
});
