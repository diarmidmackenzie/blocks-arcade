/* Detects pressing of both left grip and right grip at the same time.*/
AFRAME.registerComponent('detect-double-grip', {

  multiple: true,

  schema : {
    lhand: {type: 'selector', default: "#lhand"},
    rhand: {type: 'selector', default: "#rhand"},
    gripevent: {type: 'string', default: "grip"},
    releaseevent: {type: 'string', default: "release"}
  },

  init: function () {
    this.gripsDown = 0;
  },

  update: function () {
    this.data.lhand.addEventListener('gripdown',  () => this.gripDown());
    this.data.lhand.addEventListener('gripup',  () => this.gripUp());
    this.data.rhand.addEventListener('gripdown',  () => this.gripDown());
    this.data.rhand.addEventListener('gripup',  () => this.gripUp());
  },

  gripDown: function () {
    this.gripsDown++;

    if (this.gripsDown == 2) {
      this.el.emit(this.data.gripevent)
    }
  },

  gripUp: function () {

    if (this.gripsDown == 2) {
      this.el.emit(this.data.releaseevent)
    }
    this.gripsDown--;

    // Error correction (e.g. if grips were down on initialization)
    if (this.gripsDown < 0) {
      this.gripsDown = 0;
    }
  }
});
