AFRAME.registerComponent('thumbsticksteering', {

  schema : {
    stick: {type: 'selector', default: "#rhand"},
    increment:  {type: 'number', default: 2},
    disabled:   {type: 'boolean', default: false},
    threshold: {type: 'number', default: 0.5}
  },

  init: function () {
    this.listeners = {
      thumbstickMoved: this.thumbstickMoved.bind(this)
    }
  },

  update: function () {

    if (this.data.stick) {
      this.data.stick.addEventListener('thumbstickmoved',
                                       this.listeners.thumbstickMoved,
                                       false);
    }
  },

  thumbstickMoved: function(event) {

    if (this.data.disabled) return;

    if (Math.abs(event.detail.x) > this.data.threshold) {
      // Thumbstick moved.
      const direction = -Math.sign(event.detail.x)


      this.el.object3D.rotation.y += (Math.PI/180) *
                                     direction *
                                     this.data.increment;
    }
  }

});