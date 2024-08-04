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
