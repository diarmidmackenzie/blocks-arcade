AFRAME.registerComponent('jumptocamera', {

  schema: {
    camera:  {type: 'selector', default: "#camera"},
    event:   {type: 'string', default: "textshow"},
    distance: {type: 'number', default: 1}
  },

  init: function () {

    this.listeners = {
      jumpToCamera: this.jumpToCamera.bind(this)
    }

    this.camP = new THREE.Vector3();
    this.camQ = new THREE.Quaternion();
    this.camD = new THREE.Vector3();
    this.transformQuaternion = new THREE.Quaternion();

  },

  update: function () {

    this.el.addEventListener(this.data.event,
                             this.listeners.jumpToCamera,
                             false);
  },

  jumpToCamera: function () {

    // Get camera position
    const camera = this.data.camera.object3D
    camera.updateMatrixWorld();
    this.camP.setFromMatrixPosition(camera.matrixWorld);

    // Get camera direction vector
    this.camD.set(0, 0, -1);
    this.camQ.setFromRotationMatrix(camera.matrixWorld);
    this.camD.applyQuaternion(this.camQ);

    // Set object position
    this.el.object3D.position.copy(this.camP);
    this.el.object3D.position.addScaledVector(this.camD, this.data.distance);
    this.el.object3D.parent.worldToLocal(this.el.object3D.position);

    // Face to camera
    this.el.object3D.lookAt(this.camP);
  }

});
