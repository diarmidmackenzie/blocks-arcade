AFRAME.registerComponent('teleportcontrols', {

  schema : {
    active: {type: 'boolean', default: true}
  },

  update: function () {

    if (this.data.active) {
      this.el.setAttribute("blink-controls",
         {cameraRig: "#rig",
          teleportOrigin: "#camera",
          button: "trigger",
          rotateOnTeleport: false,
          snapTurn: false});
    }
    else {
      this.el.removeAttribute("blink-controls");
    }
  }

});
