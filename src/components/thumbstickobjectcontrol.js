/* Workarounds for the fact that event-set cannot
 * set properties on components that include dashes
 * in their names.
 * These components proxy the specific properties
 * that we need to set to the real components.  */
AFRAME.registerComponent('thumbstickobjectcontrol', {

  schema : {
    disabled: {type: 'boolean', default: false}
  },

  update: function () {
    this.el.setAttribute("thumbstick-object-control",
                         {disabled: this.data.disabled});
  }

});
