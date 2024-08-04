// Usage example:
// this-inspector__1="field:focus;logger:#camera-logger;component:blocksgame",
// this-inspector__2="field:listeners.focus;logger:#camera-logger2;component:blocksgame"
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
