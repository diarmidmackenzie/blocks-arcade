AFRAME.registerComponent('bevelled-tile', {
  schema: {
    width:      {type: 'number', default: 2},
    depth:      {type: 'number', default: 2},
    frame:      {type: 'number', default: 0.2},
    framecolor: {type: 'color', default: '#000'},
    facecolor:  {type: 'color', default: '#AAA'}
  },
  
  /**
   * Initial creation and setting of the mesh.
   */
  init: function () {
    var data = this.data;
    var el = this.el;
  
    const BIGX = this.data.width / 2;
    const BIGY = 0;
    const BIGZ = this.data.depth / 2;
    const SMALLX = this.data.width / 2 - this.data.frame;
    const SMALLY = -(this.data.frame);
    const SMALLZ = this.data.depth / 2 - this.data.frame;
  
    this.geometry = new THREE.BufferGeometry();
    // Vertices - we have 8 vertices, 2 at each corner.
    // 1-4 are the inner corners.
    // 5-8 are the outer (lower) corners
    const vertices = new Float32Array( [
       SMALLX,  BIGY, SMALLZ,
       SMALLX,  BIGY, -SMALLZ,
       -SMALLX, BIGY,  -SMALLZ,
       -SMALLX, BIGY,  SMALLZ,
  
       BIGX,  SMALLY, BIGZ,
       BIGX,  SMALLY, -BIGZ,
       -BIGX,  SMALLY, -BIGZ,
       -BIGX,  SMALLY, BIGZ,
  
    ] );
  
    // itemSize = 3 because there are 3 values (components) per vertex
    this.geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
  
    // Now we define the faces in terms of vertex indices.
    const indices = []
  
    // 4 bevelled edges.
    createRectangle(0, 4, 5, 1);
    createRectangle(1, 5, 6, 2);
    createRectangle(2, 6, 7, 3);
    createRectangle(3, 7, 4, 0);
  
    // 1 faces.
    createRectangle(0, 1, 2, 3)
  
    function createRectangle(a, b, c, d) {
      indices.push(a, b, c);
      indices.push(c, d, a);
    }
  
    this.geometry.setIndex(indices);
    this.geometry.computeVertexNormals();
  
    // 4 x 2 = 8 triangles = 24 vertices for the "frame"
    this.geometry.addGroup(0, 24, 0 );
    // 2 triangles = 6 vertices for the face.
    this.geometry.addGroup(24, 6, 1);
  
    // Create material.
    this.frameMaterial = new THREE.MeshStandardMaterial({color: data.framecolor, roughness: 0.3});
    this.faceMaterial = new THREE.MeshStandardMaterial({color: data.facecolor, roughness: 1.0});
  
    // Create mesh.
    this.mesh = new THREE.Mesh(this.geometry, [this.frameMaterial, this.faceMaterial]);
  
    // Set mesh on entity.
    el.setObject3D('mesh', this.mesh);
  }
  });
  