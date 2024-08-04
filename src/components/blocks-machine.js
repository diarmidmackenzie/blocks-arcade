import { BLOCKS_KEYS_LIBRARY,
         BLOCKS_BLOCK_LIBRARY,
         BLOCKS_BLOCK_SIZE,
         BLOCKS_BLOCK_COLORS,
         BLOCKS_CONTROLS_DESKTOP,
         BLOCKS_CONTROLS_VR } from './blocks-constants.js'

AFRAME.registerComponent('blocks-machine', {
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
    this.xoffset = ((1 - (this.data.xsize % 2)) * BLOCKS_BLOCK_SIZE)/2;
    this.zoffset = ((1 - (this.data.zsize % 2)) * BLOCKS_BLOCK_SIZE)/2;
    this.glassWidth = (this.data.xsize + 2 * (this.data.xspace)) * BLOCKS_BLOCK_SIZE
    this.glassDepth = (this.data.zsize + 2 * (this.data.zspace)) * BLOCKS_BLOCK_SIZE

    this.standWidth = this.glassWidth + (this.data.xledge * BLOCKS_BLOCK_SIZE);
    this.standDepth = this.glassDepth + (this.data. zledge * BLOCKS_BLOCK_SIZE);

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
          const x = Math.floor(ii - this.data.xsize/2) * BLOCKS_BLOCK_SIZE;
          const y = BLOCKS_BLOCK_SIZE * kk + BLOCKS_BLOCK_SIZE/2;
          const z = Math.floor(jj - this.data.zsize/2) * BLOCKS_BLOCK_SIZE;
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
    const fccenter = `0 ${this.data.baseh + (this.data.gameh * BLOCKS_BLOCK_SIZE)/2} 0`
    const fcradius = Math.sqrt(this.data.xsize * this.data.xsize +
                               this.data.zsize * this.data.zsize +
                               this.data.gameh * this.data.gameh) * BLOCKS_BLOCK_SIZE;

    const colors = BLOCKS_BLOCK_LIBRARY[this.data.shapeset].match(/,/g).length + 1;

    // layers to render blocks in arena is configurable by the URL
    var url_string = window.location.href;
    var url = new URL(url_string);
    var layers = url.searchParams.get("arena");
    if (!layers) {
      layers = "";
    }

    for (var ii = 0; ii < colors; ii++) {
      entityEl = document.createElement('a-entity');
      entityEl.setAttribute("id", `arena${this.data.id}-mesh${ii}`);
      entityEl.setAttribute("position", `0 ${this.data.baseh} 0`);
      entityEl.setAttribute("framed-block", `facecolor: ${BLOCKS_BLOCK_COLORS[ii]}; framecolor: black`);
      entityEl.setAttribute("instanced-mesh",
                            `capacity: ${(this.data.xsize * this.data.zsize * this.data.gameh)};
                             fccenter:${fccenter};
                             fcradius:${fcradius};
                             layers:${layers}`);
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
      entityEl.setAttribute("position", `${this.xoffset} ${this.data.baseh + (this.data.gameh * BLOCKS_BLOCK_SIZE) + 0.25} ${this.zoffset}`);
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
      entityEl.setAttribute("position", `${this.xoffset} ${this.data.baseh + (this.data.gameh * BLOCKS_BLOCK_SIZE) + 0.25} ${this.zoffset}`);
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
                    ${this.data.baseh + (this.data.gameh * BLOCKS_BLOCK_SIZE)/2}
                    ${this.zoffset}`);
    this.el.appendChild(entityEl);

  },

  createShapeGenerator: function() {

    var entityEl = document.createElement('a-entity');
    entityEl.setAttribute("id", `shapegen${this.data.id}`);

    var shapeGenString = `arena:#arena${this.data.id};`
    shapeGenString += `shapes:${BLOCKS_BLOCK_LIBRARY[this.data.shapeset]};`
    shapeGenString += `keys:${BLOCKS_KEYS_LIBRARY[this.gametype]};`
    shapeGenString += "movecontrol: #lhand.thumbstick,#rhand.grip;"
    shapeGenString += "rotatecontrol: #rhand.thumbstick,#rhand.grip;"
    if (this.gametype == "2D") {
      shapeGenString += "rotateaxes:Z;"
    }
    if (!this.data.tutorial) {
      shapeGenString += `nextshape:#nextShapeContainer${this.data.id};`
    }
    shapeGenString += `pershapemixin:block;`
    shapeGenString += `arenapershapemixin:arena${this.data.id}-mixin;`
    shapeGenString += `tutorial:${this.data.tutorial}`


    entityEl.setAttribute("shapegenerator", shapeGenString);

    var shapegenheight = (this.data.gameh * BLOCKS_BLOCK_SIZE)
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
               `-${this.glassWidth/2 + 0.5} ${this.data.baseh + (this.data.gameh * BLOCKS_BLOCK_SIZE)} 0`);
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
    entityEl.setAttribute("blocksgame",
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
                           ${this.data.baseh + (this.data.gameh * BLOCKS_BLOCK_SIZE) + 0.25}
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
                           ${this.data.baseh + (this.data.gameh * BLOCKS_BLOCK_SIZE)/2}
                           ${this.zoffset + (this.glassDepth /2) + 0.001}`);
     if (!this.data.tutorial) {
      entityEl.setAttribute("dualtext",
                            `desktoptext:${this.data.description}\n\n\n${BLOCKS_CONTROLS_DESKTOP[this.gametype]};
                             vrtext:${this.data.description}\n\n\n${BLOCKS_CONTROLS_VR[this.gametype]}`);
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
