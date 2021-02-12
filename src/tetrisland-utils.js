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

const TETRIS_CONTROLS_DESKTOP = {
  '2D': `Controls:\n\nEnter to start\n\nMove L/R:\n Z & X\n\nRotate:\nR-Shift/Enter\n\nSpace to drop`,
  '3D': `Controls:\n\nEnter to start\n\nMove in the\nhorizontal plane:\n YGHJ\n\nRotations:\nYaw: 4/6\nPitch: 5/8\nRoll:7/9\n\nSpace to drop`
}

const TETRIS_CONTROLS_VR = {
  '2D': `Controls:\n\nTouch the sphere\n to start\nMove:\nGrip & move\nRotate:\nGrip & turn\nA to drop`,
  '3D': `Controls:\n\nTouch the sphere\n to start\nMove:\nGrip & move\nRotate:\nGrip & turn\nA to drop`
}





AFRAME.registerComponent('tetris-machine', {
  schema: {
    id:       {type: 'string'},
    shapeset: {type: 'string'},
    label:    {type: 'string'},
    xsize:    {type: 'number'},
    zsize:    {type: 'number'},
    gameh:    {type: 'number', default: 20},
    baseh:    {type: 'number', default: 0.5},
    xspace:   {type: 'number', default: 0},
    zspace:   {type: 'number', default: 0},
    xledge:   {type: 'number', default: 1},
    zledge:   {type: 'number', default: 1},
    description: {type: 'string'},
    gametype: {type:'string'},
    pershapemixin:  {type: 'string'},
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
    entityEl = document.createElement('a-entity');
    entityEl.setAttribute("id", "arena" + this.data.id);
    entityEl.setAttribute("arena", `x:${this.data.xsize};z:${this.data.zsize};clear:${this.data.clear}`);
    entityEl.setAttribute("position", `0 ${this.data.baseh} 0`);
    this.el.appendChild(entityEl);

    // Create the stand.
    var entityEl = document.createElement('a-entity');
    entityEl.setAttribute("id", "stand" + this.data.id);
    entityEl.setAttribute("proximity", "target:#camera;axes:XZ;start:focus;end:defocus;distance:2.5");
    entityEl.setAttribute("shadow", "receive:true");
    //entityEl.setAttribute("mixin", "stand");
    entityEl.setAttribute("framed-block",
                          `facecolor: black;
                          framecolor: white;
                          width: ${this.standWidth};
                          height:${this.data.baseh};
                          depth: ${this.standDepth};
                          frame: 0.05`);
    entityEl.setAttribute("position", `${this.xoffset} ${this.data.baseh/2} ${this.zoffset}`);
    // Dunno if this works...
    entityEl.setAttribute("event-set__focus", "_event: focus; framed-block.framecolor:#5786b8");
    entityEl.setAttribute("event-set__defocus", "_event: defocus; framed-block.framecolor:#854c40");
    this.el.appendChild(entityEl);


    // Finally, the glass casing.

    var entityEl = document.createElement('a-box');
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
    if (this.data.pershapemixin) {
      shapeGenString += `pershapemixin:${this.data.pershapemixin};`
    }

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
                          `game:${this.data.hiscoreid}`)
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
                           _event:start; visible:false`);
    this.el.appendChild(entityEl);

  },

  createScoreboard: function() {

    entityEl = document.createElement('a-text');
    entityEl.setAttribute("id", `scoreboard${this.data.id}`);
    entityEl.setAttribute("width", "2");
    entityEl.setAttribute("position",
                          `${this.xoffset - (this.glassWidth *(2/5))}
                           ${this.data.baseh + (this.data.gameh * TETRIS_BLOCK_SIZE) - 0.2}
                           ${this.zoffset + (this.glassDepth /2) + 0.001}`);
    entityEl.setAttribute("value", "Score: 0");
    entityEl.setAttribute("color", "white");
    this.el.appendChild(entityEl);

  },

  createHelpText: function() {

    entityEl = document.createElement('a-text');
    entityEl.setAttribute("id", `help${this.data.id}`);
    entityEl.setAttribute("color", "white");
    entityEl.setAttribute("width", "1");
    entityEl.setAttribute("position",
                          `${this.xoffset - (this.glassWidth *(2/5))}
                           ${this.data.baseh + (this.data.gameh * TETRIS_BLOCK_SIZE)/2 - 0.2}
                           ${this.zoffset + (this.glassDepth /2) + 0.001}`);
    entityEl.setAttribute("dualtext",
                          `desktoptext:${this.data.label}\n\n${this.data.description}\n${TETRIS_CONTROLS_DESKTOP[this.gametype]};
                           vrtext:${this.data.label}\n\n${this.data.description}\n${TETRIS_CONTROLS_DESKTOP[this.gametype]}`);
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
  this.frameMaterial = new THREE.MeshPhongMaterial({color: data.framecolor, roughness: 0.3});
  this.faceMaterial = new THREE.MeshPhongMaterial({color: data.facecolor, roughness: 1.0});

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
    interval: {type: 'number', default: 5000}
  },

  init: function() {
    this.httpResponseFunction = this.dataCallback.bind(this);
    this.displayIndex = 0;
  },

  update: function() {
    const gameId = this.data.games[this.displayIndex];
    const queryURL = `${this.data.url}/list?game=${gameId}&count=5`
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = this.httpResponseFunction;
    xmlHttp.open("GET", queryURL, true); // true for asynchronous
    xmlHttp.send(null);
  },

  tick: function(time, timeDelta) {

    var last_time = time - timeDelta;
    var remainderNow = time % (this.data.interval);
    var lastRemainder = last_time % (this.data.interval);

    if (remainderNow < lastRemainder) {
      // We just crossed a time interval.  So move to the next scoreboard.
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
      this.presentData(jsonData);
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
    }
    else
    {
      text += "No scores yet - be the first!\n"
    }
    return(text)
  }
});

AFRAME.registerComponent('hi-score-logger', {
  schema: {
    url:   {type: 'string', default: "https://tetrisland.pythonanywhere.com/hiscores"},
    game:  {type: 'string', default: ""}
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
  }
});
