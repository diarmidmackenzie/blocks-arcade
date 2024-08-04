import { BLOCKS_KEYS_LIBRARY, BLOCKS_BLOCK_LIBRARY } from './blocks-constants.js'

AFRAME.registerComponent('blocks-tutorial', {
  schema: {
    id:       {type: 'string'},
    tutorialtext: {type: 'selector', default: "#tutorialtext"}
  },

  init: function() {
    var entityEl = document.createElement('a-entity');
    entityEl.setAttribute("blocks-machine",
                          `id: ${this.data.id};
                          label:Tutorial;
                          shapeset:3D4Blocks;
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
      this.step10.bind(this),
      this.step11.bind(this)
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

    // Set up Shape Generator & Arena to 2D settings.
    var shapeGenString = `keys:${BLOCKS_KEYS_LIBRARY['DropOnly']};`
    shapeGenString += `shapes:${BLOCKS_BLOCK_LIBRARY['2D4Blocks']};`
    shapeGenString += `rotateaxes:Z;`
    this.generator.setAttribute("shapegenerator", shapeGenString);

    // Set up Shape Generator & Arena to 2D settings.
    // This can work on the arena, since it is clear (if it was not clear
    // that would cause all sorts of problems...)
    var arenaString = `z:1;`
    this.arena.setAttribute("arena", arenaString);

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     Let's start with the 2D games...

     Shapes will fall into the play area (this one is not falling because we are in a tutorial).

     Position them to create complete layers of blocks.
     When a layer of blocks is completed, it disappears.
     You get more points for filling multiple layers at once.

     Hold Space to drop this shape into the gap.;
     vrtext:
     Let's start with the 2D games...

     Shapes will fall into the play area  (this one is not falling because we are in a tutorial).

     Position them to create complete layers of blocks.
     When a layer of blocks is completed, it disappears.
     You get more points for filling multiple layers at once.

     hold A, X or Right Trigger to drop this shape into the gap.`);

     // Put some blocks in place to create
     // an almost-complete layer.
     // !! TO DO - fix this...
     this.createBlock(-0.2,    0.05,    0, 6);
     this.createBlock(   0,    0.05,    0, 0);
     this.createBlock( 0.1,    0.05,    0, 1);
     this.createBlock( 0.2,    0.05,    0, 1);
     this.createBlock( 0.3,    0.05,    0, 1);

     this.createBlock(-0.2,    0.15,    0, 6);
     this.createBlock( 0.2,    0.15,    0, 1);
     this.createBlock( 0.3,    0.15,    0, 1);

     // Set the shape generator to have controls
     // disabled.
     shapeGenString += "movecontrol:none;"
     shapeGenString += "rotatecontrol:none;"

     this._generator.nextShapeChoice = 2;
     this._generator.generateShape(true);
  },

  step2: function () {
    this._arena.clearArena();

    // Set the shape generator back to normal 2D settings
    var shapeGenString = `keys:${BLOCKS_KEYS_LIBRARY['2D']};`
    shapeGenString += "movecontrol: #lhand.thumbstick,#rhand.grip;"
    shapeGenString += "rotatecontrol: #rhand.thumbstick,#rhand.grip;"
    this.generator.setAttribute("shapegenerator", shapeGenString);

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
    Use Z & X to move left and right, and R-Shift and Enter to rotate in either direction.

    Try it now!  When you're ready, hold Space to drop the shape and move on.;
    vrtext:
    You can move shapes left and right using the left thumbstick.  You can rotate them using the right thumbstick.

    Or, if you prefer, you can hold the Grip on the right controller, and move and rotate the controller to move and rotate the shape.

    Try it now!  When you're ready, hold A, X or Right Trigger to drop the shape and move on.`);

    this._generator.nextShapeChoice = 3;
    this._generator.generateShape(true);

  },

  step3: function () {

    this._arena.clearArena();

    // Set up Shape Generator & Arena back to 3D settings.
    shapeGenString += `shapes:${BLOCKS_BLOCK_LIBRARY['3D4Blocks']};`
    shapeGenString += `rotateaxes:XYZ;`
    this.generator.setAttribute("shapegenerator", shapeGenString);

    var arenaString = `z:6;`
    this.arena.setAttribute("arena", arenaString);

    // Set up Shape Generator with limited controls (no move/rotate).
    var shapeGenString = `keys:${BLOCKS_KEYS_LIBRARY['DropOnly']};`
    shapeGenString += "movecontrol:none;"
    shapeGenString += "rotatecontrol:none;"
    shapeGenString += `shapes:${BLOCKS_BLOCK_LIBRARY['3D4Blocks']};`
    this.generator.setAttribute("shapegenerator", shapeGenString);

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     For a 3D game, you need to fill a complete layer of blocks before it will disappear.

     Hold Space to drop this block into the gap.;
     vrtext:
     For a 3D game, you need to fill a complete layer of blocks before it will disappear.

     Hold A, X or Right Trigger to drop this block into the gap.`);
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

  step4: function () {
    this._arena.clearArena();

    // Set up Shape Generator back to normal settings (full movement)
    var shapeGenString = `keys:${BLOCKS_KEYS_LIBRARY['3D']};`
    shapeGenString += "movecontrol: #lhand.thumbstick,#rhand.grip;"
    shapeGenString += "rotatecontrol: #rhand.thumbstick,#rhand.grip;"
    this.generator.setAttribute("shapegenerator", shapeGenString);

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     There are lots of different games in this arcade.

     When you look at a nearby game, it becomes active, and the base lights up.  Try looking at another game, and then back at this one.

     Your controls will only affect the currently active game.

     When you're ready, hold Space to drop the shape and move on.;

     vrtext:
     There are lots of different games in this arcade.

     When you look at a nearby game, it becomes active, and the base lights up.  Try looking at another game, and then back at this one.

     Your controls will only affect the currently active game.

     When you're ready, hold A, X or Right Trigger to drop the shape and move on.`);

    this._generator.nextShapeChoice = 3;
    this._generator.generateShape(true);

  },

  step5: function () {

    this._arena.clearArena();

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     In 3D games, shapes can be moved forwards and backwards as well as left and right.

     Use keys YGHJ (like WASD) to move this block around.

     Try it now!  When you've finished, hold Space to drop the shape and move on.;
     vrtext:
     In 3D games, shapes can be moved forwards and backwards as well as left and right.

     Use the left thumbstick to move this block around.

     Or hold right grip and move the controller to move the block.

     Try it now!  When you've finished, hold A, X or Right Trigger to drop the shape and move on.`);
    this._generator.nextShapeChoice = 0;
    this._generator.generateShape(true);

  },

  step6: function () {
    this._arena.clearArena();

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     In 3D, there are 3 different ways that blocks can be rotated.

     To rotate the shape forwards or backwards (like nodding your head) use 5 & 8 on the number pad.

     Try it now!  When you've finished, hold Space to drop the shape and move on.;
     vrtext:
     In 3D, there are 3 different ways that blocks can be rotated.

     To rotate the shape forwards or backwards (like nodding your head) push the right thumbstick forwards or backwards.

     Try it now!  When you've finished, hold A, X or Right Trigger to drop the shape and move on.`);
    this._generator.nextShapeChoice = 2;
    this._generator.generateShape(true);

  },

  step7: function () {
    this._arena.clearArena();

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     To roll the shape to the left or right (like tilting your head) use the 7 & 9 keys on the number pad.

     Try it now!  When you've finished, hold Space to drop the shape and move on.;
     vrtext:
     To roll the shape to the left or right (like tilting your head) push the right thumbstick left or right.

     Try it now!  When you've finished, hold A, X or Right Trigger to drop the shape and move on.`);
    this._generator.nextShapeChoice = 3;
    this._generator.generateShape(true);

  },


  step8: function () {
    this._arena.clearArena();

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     To turn the shape (like a turntable) use the 4 & 6 keys on the number pad.

     Try it now!  When you've finished, hold Space to drop the shape and move on.;
     vrtext:
     You can also turn the shape (like a turntable).

     To do this, tilt the entire right controller 90 degrees to a horizontal position.  Now use the right thumbstick to turn the shape.

     Try it now!  When you've finished, hold A, X or Right Trigger to drop the shape and move on.`);
    this._generator.nextShapeChoice = 5;
    this._generator.generateShape(true);

  },

  step9: function () {
    this._arena.clearArena();

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
     As you can see, moving into 3D means we have some new shapes that don't appear in 2D games.

     Try rotating this one to discover all the orientations that it can be put into.

     When you've finished, hold Space to drop the shape and move on.;
     vrtext:
     As an alternative to using the thumbstick, try holding down the grip button on the right controller and rotating the entire controller.

     On your right hand, you'll see a shape appear that will help to guide your movements.

     Try it now!  When you've finished, hold A, X or Right Trigger to drop the shape and move on.`);
    this._generator.nextShapeChoice = 6;
    this._generator.generateShape(true);

  },

  step10: function () {

    this._arena.clearArena();

    this.data.tutorialtext.setAttribute("dualtext",
    `desktoptext:
    The controls are fixed relative to the play area.

    If you try playing from the side or back of the board, you may find the controls confusing.

    You'll find it easiest to stay in a fixed position in front of the play area.  Press keys 1-9 to jump straight to a good position for each game.

    When you are ready to start playing, hold Space to drop the shape, and then pick a game to play.;
    vrtext:
    As you move around the play area, controls will adapt to your orientation, so you can play the game from any position.

    If you are playing seated, or don't have much space, hold both left and right grip buttons together to access various locomotion controls.

    When you are ready to play, hold A, X or Right Trigger to drop the shape, then choose a game to play.`);

    this._generator.nextShapeChoice = 2;
    this._generator.generateShape(true);
  },

  step11: function () {
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
