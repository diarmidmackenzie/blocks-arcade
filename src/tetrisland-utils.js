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
    targets: {type: 'array'},
    //fov: {type: 'number', default: 30},
    maxdistance: {type: 'number', default: 10},
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
    }

    var bestScore = 0;
    var bestTarget;

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

  getTargetScore: function (target) {

    target.object3D.getWorldPosition(this.targetWorldPosition);

    var camera = this.el;
    camera.object3D.updateMatrixWorld();
    this.cameraWorldPosition.setFromMatrixPosition(camera.object3D.matrixWorld);

    this.vectorToTarget.subVectors(this.targetWorldPosition,
                                   this.cameraWorldPosition);
    this.zeroUnusedVectorAxes(this.vectorToTarget);

    var distance = this.vectorToTarget.length();
    var angle = 1;

    if (distance < this.data.maxdistance) {
      // Within range: check angles.
      this.cameraQuaternion.setFromRotationMatrix(camera.object3D.matrixWorld)

      this.cameraDirectionVector.set(0,0,-1);
      this.cameraDirectionVector.applyQuaternion(this.cameraQuaternion);
      this.zeroUnusedVectorAxes(this.cameraDirectionVector);

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
/* End experimental function */

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
    switch (event.key) {
      case "-":
        this.jump(-1);
        break;

      case "=":
        this.jump(1);
        break;

      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
          var prevPosition = this.currentPosition;
          this.currentPosition = (event.key.charCodeAt(0) - "0".charCodeAt(0));
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
  '3DTetris' : "EEE,EEN,ENE,ENSE,ENW,ENSD,EDN",
  '2DPentris': "EEEE,EEEU,EEED,EEUE,EEDE,EEUDE,EEDUE,EEDD,EEDW,EEUW,EEWDD,EDED,EDEWD,WDWED,EUDDUE,DEEU,DEED,UEEU",
  '3DPentris': "EEEE,EEES,EESE,EESS,EESW,EEWSS,ESES,ESEWS,EUDDUE,SEEN,SEES,EESU,EESD,EEWSD,ESEU,ESED,ESEWU,ESEWD",
  '2DPentrisEasy': "EEEE,EEEU,EEED,EEUE,EEDE,EEUDE,EEDUE,EEDW,EEUW,DEEU",
  '3D1BlockMulticolor' : ",,,,,,",
  '3D1Block1color' : "",
  '3D3BlockMulticolor' : "EE,EE,EE,EE,EE,EE,EE",
}
const TETRIS_KEYS_LIBRARY = {
  '2D': `KeyZ=xminus,KeyX=xplus,Enter=zRotMinus,ShiftRight=zRotPlus,Space=$drop,#rhand.abuttondown=$drop,#rhand.abuttonup=%drop`,
  '3D': `KeyG=xminus,KeyJ=xplus,KeyY=zminus,KeyH=zplus,
         Numpad8=xRotMinus,Numpad5=xRotPlus,Numpad4=yRotPlus,Numpad6=yRotMinus,
         Numpad7=zRotMinus,Numpad9=zRotPlus,
         Space=$drop,#rhand.abuttondown=$drop,#rhand.abuttonup=%drop`
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
  '2D': `Controls:\n\nEnter to start\nMove L/R: Z & X\nRotate: R-Shift/Enter\n\nSpace to drop`,
  '3D': `Controls:\n\nEnter to start\nMove in the horizontal plane: YGHJ\nRotations:\nYaw: 4/6\nPitch: 5/8\nRoll:7/9\n\nSpace to drop`
}

const TETRIS_CONTROLS_VR = {
  '2D': `Controls:\nRight trigger to start\nMove: Left Thumbstick or\nRight Grip & move\n\nRotate: Right Thumbstick or\nRight Grip & turn\n\nA or X to drop`,
  '3D': `Controls:\nRight trigger to start\nMove: Left Thumbstick or\nRight Grip & move\n\nRotate: Right Thumbstick or\nRight Grip & turn\n\nA or X to drop`
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
    clear: {type: 'string', default: "layer"}
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
  },

  createArena: function() {

    // create the arena.  Not visible, so don't care about dimensions, just
    // position.
    var entityEl = document.createElement('a-entity');
    entityEl.setAttribute("id", "arena" + this.data.id);
    entityEl.setAttribute("arena", `x:${this.data.xsize};z:${this.data.zsize};clear:${this.data.clear}`);
    entityEl.setAttribute("position", `0 ${this.data.baseh} 0`);
    this.el.appendChild(entityEl);

    // In this same position, we create an InstancedMesh and Arena Mixin for each
    // block color that can land in the arena.
    const colors = TETRIS_BLOCK_LIBRARY[this.data.shapeset].match(/,/g).length + 1;
    for (var ii = 0; ii < colors; ii++) {
      entityEl = document.createElement('a-entity');
      entityEl.setAttribute("id", `arena${this.data.id}-mesh${ii}`);
      entityEl.setAttribute("position", `0 ${this.data.baseh} 0`);
      entityEl.setAttribute("framed-block", `facecolor: ${TETRIS_BLOCK_COLORS[ii]}; framecolor: black`);
      entityEl.setAttribute("instanced-mesh", `capacity: ${(this.data.xsize * this.data.zsize * this.data.gameh)}; debug:true`);
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
                          framecolor: white;
                          width: ${this.standWidth};
                          height:${this.data.baseh};
                          depth: ${this.standDepth};
                          frame: 0.05`);
    entityEl.setAttribute("position", `${this.xoffset} ${this.data.baseh/2} ${this.zoffset}`);
    entityEl.setAttribute("event-set__focus1", `_event: focus;_target:#stand-focus${this.data.id}; visible:true`);
    entityEl.setAttribute("event-set__focus2", `_event: focus;_target:#stand${this.data.id}; visible:false`);
    entityEl.setAttribute("event-set__defocus1", `_event: defocus;_target:#stand-focus${this.data.id}; visible:false`);
    entityEl.setAttribute("event-set__defocus2", `_event: defocus;_target:#stand${this.data.id}; visible:true`);
    this.el.appendChild(entityEl);

    // And a second (invisible) stand, yellow rather than white edging.  Switched in to show focus.
    entityEl = document.createElement('a-entity');
    entityEl.setAttribute("id", "stand-focus" + this.data.id);
    entityEl.setAttribute("shadow", "receive:true");
    entityEl.setAttribute("framed-block",
                          `facecolor: black;
                          framecolor: yellow;
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
    entityEl = document.createElement('a-entity');
    entityEl.setAttribute("id", "top" + this.data.id);
    entityEl.setAttribute("framed-block",
                          `facecolor: black;
                          framecolor: white;
                          width: ${this.standWidth};
                          height: 0.5;
                          depth: ${this.standDepth};
                          frame: 0.05`);
    entityEl.setAttribute("position", `${this.xoffset} ${this.data.baseh + (this.data.gameh * TETRIS_BLOCK_SIZE) + 0.25} ${this.zoffset}`);
    this.el.appendChild(entityEl);


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
    shapeGenString += "movecontrol: #lhand.thumbstick,#rhand.grip;"
    shapeGenString += "rotatecontrol: #rhand.thumbstick,#rhand.trigger;"
    shapeGenString += `nextshape:#nextShapeContainer${this.data.id};`

    shapeGenString += `pershapemixin:block;`
    shapeGenString += `arenapershapemixin:arena${this.data.id}-mixin;`


    entityEl.setAttribute("shapegenerator", shapeGenString);

    entityEl.setAttribute("position",
              `0 ${this.data.baseh + (this.data.gameh * TETRIS_BLOCK_SIZE)} 0`);
    this.el.appendChild(entityEl);

    // And the "next block" displayer...
    entityEl = document.createElement('a-entity');
    entityEl.setAttribute("id", `nextShapeContainer${this.data.id}`);
    entityEl.setAttribute("position",
             `-${this.glassWidth/2 + 0.5} ${this.data.baseh + (this.data.gameh * TETRIS_BLOCK_SIZE)} 0`);
    this.el.appendChild(entityEl);

  },

  createGameStart: function() {

    // Use box not sphere - huge difference in number of triangles!
    var entityEl = document.createElement('a-box');
    entityEl.setAttribute("id", `game${this.data.id}`);
    entityEl.setAttribute("tetrisgame",
                          `generator: #shapegen${this.data.id};
                          scoreboard: #scoreboard${this.data.id};
                          arena: #arena${this.data.id};
                          levelspeedup: ${this.data.levelspeedup};
                          focus:false`);
    entityEl.setAttribute("hi-score-logger",
                          `game:${this.data.hiscoreid};
                           table:#hiscores`)
    entityEl.setAttribute("debug", "true");
    entityEl.setAttribute("position", `${this.glassWidth/2 + 0.5} 1.1 0`);
    entityEl.setAttribute("rotation", "0 -30 0");
    entityEl.setAttribute("mixin", "glass start");
    entityEl.setAttribute("src", "start.png");
    entityEl.setAttribute("key-bindings",
                          `bindings:Enter=start,
                          #stand${this.data.id}.focus=focus,
                          #stand${this.data.id}.defocus=defocus`);
    entityEl.setAttribute("event-set__show",
                          `_target:#help${this.data.id};
                           _event:game-over; visible:true`);
    entityEl.setAttribute("event-set__hide",
                          `_target:#help${this.data.id};
                           _event:started; visible:false`);
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
    entityEl.setAttribute("dualtext",
                          `desktoptext:${this.data.description}\n\n${TETRIS_CONTROLS_DESKTOP[this.gametype]};
                           vrtext:${this.data.description}\n\n${TETRIS_CONTROLS_VR[this.gametype]}`);
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
  // this.material = new THREE.MeshStandardMaterial({color: data.color1});
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
      this.lastTickTime = time;
      this.displayIndex++;
      if (this.displayIndex >= this.data.games.length) {
        this.displayIndex = 0;
      }
      this.update();
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
    if (this.inFocus) {
      if (this.sceneEl.is('vr-mode')) {
        text += "\n" + this.data.vrcontrols;
      }
      else
      {
        text += "\n" + this.data.keyboardcontrols;
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
  },

  defocus: function() {
    this.inFocus = false;
  },

  next: function() {

    if (this.inFocus) {
      this.displayIndex++;
      if (this.displayIndex >= this.data.games.length) {
        this.displayIndex = 0;
      }
      this.update();

    }
  },

  prev: function() {
    if (this.inFocus) {
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
  },

  gameOver: function (event) {
    const data = {game: this.data.game,
                  score: event.detail.score,
                  level: event.detail.level,
                  gametime: event.detail.gametime};
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
