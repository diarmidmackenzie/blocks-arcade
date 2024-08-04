// This component only works for elements in the world reference.
// Only affects rotation about y axis, not x & z.
AFRAME.registerComponent('rotate-to-face-player', {

  schema : {
    camera: {type: 'selector', default: "#camera"}
  },

  tick: function() {
    this.trackCamera();
  },

  trackCamera: (function() {

    var vectorToCamera = new THREE.Vector3();
    var cylindrical = new THREE.Cylindrical();

    return function() {
      // Get Camera World Position.
      var camera = this.data.camera;
      camera.object3D.updateMatrixWorld();
      vectorToCamera.setFromMatrixPosition(camera.object3D.matrixWorld);

      vectorToCamera.sub(this.el.object3D.position);

      // Determine angle to camera, and set this rotation on the object.
      cylindrical.setFromVector3(vectorToCamera);
      this.el.object3D.rotation.y = cylindrical.theta;
    }
  })()
});
