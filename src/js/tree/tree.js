import times from 'lodash/utility/times';
import THREE from 'three';

const matrix = new THREE.Matrix4();
const vector = new THREE.Vector3();

function rotateWorld( object, vector ) {
  const { parent } = object;
  if ( !parent ) {
    return vector;
  }

  if ( parent.type === 'EquilateralTriangularPrism' ) {
    if ( object === parent.left  ) { parent.transformLeft();  }
    if ( object === parent.right ) { parent.transformRight(); }
  }

  return vector.applyMatrix4( matrix.extractRotation( parent.matrixWorld ) );
}

function getParentBoneIndex( object ) {
  const { parent } = object;
  // Default to first bone.
  if ( !parent ) {
    return 0;
  }

  if ( parent.type === 'EquilateralTriangularPrism' ) {
    if ( object === parent.left )  { return parent.leftIndex;  }
    if ( object === parent.right ) { return parent.rightIndex; }
  }

  return parent.index;
}

/*
  A tree is composed of trapezoids, with branches terminating with triangles.

  If a trapezoid branches, then a triangular prism joint is added to the distal
  end so that branches can be attached.

  To simplify calculations, geometries are generated so that they lie on the
  x/z plane before being joined together.

  Positive z-axis points outwards.
 */
export class TrapezoidalPrism extends THREE.Object3D {
  constructor( bottomWidth = 1, topWidth = 1, height = 1, depth = 1 ) {
    super();

    this.type = 'TrapezoidalPrism';

    this.bottomWidth = bottomWidth;
    this.topWidth    = topWidth;
    this.height      = height;
    this.depth       = depth;

    this.index = 0;

    this.position.set( 0, height, 0 );
    this.updateMatrixWorld();
  }

  createGeometry() {
    const geometry = new THREE.Geometry();

    const {
      bottomWidth,
      topWidth,
      height,
      depth
    } = this;

    const halfBottomWidth = bottomWidth / 2;
    const halfTopWidth    = topWidth    / 2;

    const halfDepth = depth / 2;

    geometry.vertices = [
      // Bottom counter-clockwise from front-left.
      new THREE.Vector3( -halfBottomWidth, 0,       halfDepth ),
      new THREE.Vector3(  halfBottomWidth, 0,       halfDepth ),
      new THREE.Vector3(  halfBottomWidth, 0,      -halfDepth ),
      new THREE.Vector3( -halfBottomWidth, 0,      -halfDepth ),
      // Top counter-clockwise from front-left.
      new THREE.Vector3( -halfTopWidth,    height,  halfDepth ),
      new THREE.Vector3(  halfTopWidth,    height,  halfDepth ),
      new THREE.Vector3(  halfTopWidth,    height, -halfDepth ),
      new THREE.Vector3( -halfTopWidth,    height, -halfDepth )
    ];

    geometry.faces = [
      // Front.
      new THREE.Face3( 0, 1, 5 ),
      new THREE.Face3( 0, 5, 4 ),
      // Left.
      new THREE.Face3( 0, 4, 3 ),
      new THREE.Face3( 4, 7, 3 ),
      // Back.
      new THREE.Face3( 2, 3, 7 ),
      new THREE.Face3( 2, 7, 6 ),
      // Right.
      new THREE.Face3( 1, 2, 6 ),
      new THREE.Face3( 1, 6, 5 )
    ];

    return geometry;
  }

  createBone( geometry ) {
    vector.set( 0, this.height, 0 );
    rotateWorld( this, vector );

    const index = geometry.bones.push({
      parent: getParentBoneIndex( this ),
      name: 'trapezoidal',
      pos: vector.toArray(),
      rotq: [ 0, 0, 0, 1 ]
    }) - 1;

    this.index = index;

    times( 8, () => {
      geometry.skinIndices.push( new THREE.Vector4( index, 0, 0, 0 ) );
      geometry.skinWeights.push( new THREE.Vector4( 1, 0, 0, 0 ) );
    });

    return geometry;
  }
}


export class EquilateralTriangularPrism extends THREE.Object3D {
  constructor( width = 1, depth = 1, direction ) {
    super();

    this.type = 'EquilateralTriangularPrism';

    this.width = width;
    this.depth = depth;
    this.direction = direction;

    this.halfWidth = width / 2;
    this.halfDepth = depth / 2;

    this.height = Math.sqrt( 3 ) * this.halfWidth;
    this.halfHeight = this.height / 2;

    this.x = 0;
    this.angle = 0;
    if ( direction === 'left'  ) { this.transformLeft();  }
    if ( direction === 'right' ) { this.transformRight(); }

    // Branching slots.
    this.left  = undefined;
    this.right = undefined;

    this.leftIndex  = undefined;
    this.rightIndex = undefined;

    this.updateTransform();
  }

  add( object, direction ) {
    super.add( object );

    if ( direction === 'left'  ) { this.left  = object; }
    if ( direction === 'right' ) { this.right = object; }
  }

  updateTransform() {
    this.position.set( this.x, this.halfHeight, 0 );
    this.rotation.z = this.angle;
    this.updateMatrixWorld();
  }

  setLeft() {
    this.x = -this.halfWidth / 2;
    this.angle = Math.PI / 3;
  }

  setRight() {
    this.x = this.halfWidth / 2;
    this.angle = -Math.PI / 3;
  }

  transformLeft() {
    this.setLeft();
    this.updateTransform();
  }

  transformRight() {
    this.setRight();
    this.updateTransform();
  }

  /*
    Equilateral triangular prism:

                  5
               .-o
          4 .-'   \  back
           o       o
    front / \   .-' 2
         o---o-'
        0     1
    Only the front and back triangles are visible.
   */
  createGeometry() {
    const geometry = new THREE.Geometry();

    const {
      height,
      halfWidth,
      halfDepth,
      direction
    } = this;

    geometry.vertices = [
      // Bottom counter-clockwise from bottom-left.
      new THREE.Vector3( -halfWidth, 0,  halfDepth ),
      new THREE.Vector3(  halfWidth, 0,  halfDepth ),
      new THREE.Vector3(  halfWidth, 0, -halfDepth ),
      new THREE.Vector3( -halfWidth, 0, -halfDepth ),
      // Top, front-to-back.
      new THREE.Vector3( 0, height,  halfDepth ),
      new THREE.Vector3( 0, height, -halfDepth )
    ];

    geometry.faces = [
      // Front.
      new THREE.Face3( 0, 1, 4 ),
      // Back.
      new THREE.Face3( 2, 3, 5 )
    ];

    // Left-only rotation. Show right side.
    if ( direction === 'left' ) {
      geometry.faces.push( new THREE.Face3( 1, 2, 5 ) );
      geometry.faces.push( new THREE.Face3( 1, 5, 4 ) );
    }

    // Right-only rotation. Show left side.
    if ( direction === 'right' ) {
      geometry.faces.push( new THREE.Face3( 0, 4, 3 ) );
      geometry.faces.push( new THREE.Face3( 4, 5, 3 ) );
    }

    return geometry;
  }

  createDirectionalBone( geometry ) {
    const parent = getParentBoneIndex( this );

    vector.set( this.x, this.halfHeight, 0 );
    rotateWorld( this, vector );

    // Return bone index.
    return geometry.bones.push({
      parent,
      name: 'equilateral-triangular',
      pos: vector.toArray(),
      rotq: [ 0, 0, 0, 1 ]
    }) - 1;
  }

  createBone( geometry ) {
    if ( this.left ) {
      this.setLeft();
      this.leftIndex = this.createDirectionalBone( geometry );
    }

    if ( this.right ) {
      this.setRight();
      this.rightIndex = this.createDirectionalBone( geometry );
    }

    // Compute bone weights.
    let leftWeight  = 0;
    let rightWeight = 0;

    const finiteLeftIndex  = isFinite( this.leftIndex  );
    const finiteRightIndex = isFinite( this.rightIndex );
    if ( finiteLeftIndex && finiteRightIndex ) {
      leftWeight  = 0.5;
      rightWeight = 0.5;
    } else if ( finiteLeftIndex ) {
      leftWeight  = 1;
    } else if ( finiteRightIndex ) {
      rightWeight = 1;
    }

    const {
      leftIndex  = 0,
      rightIndex = 0
    } = this;

    times( 6, () => {
      geometry.skinIndices.push( new THREE.Vector4( leftIndex,  rightIndex,  0, 0 ) );
      geometry.skinWeights.push( new THREE.Vector4( leftWeight, rightWeight, 0, 0 ) );
    });

    return geometry;
  }
}


export class Pyramid extends THREE.Object3D {
  constructor( width = 1, height = 1, depth = 1 ) {
    super();

    this.type = 'Pyramid';

    this.width  = width;
    this.height = height;
    this.depth  = depth;

    this.halfWidth  = width  / 2;
    this.halfHeight = height / 2;
    this.halfDepth  = depth  / 2;

    this.index = 0;
  }

  createGeometry() {
    const geometry = new THREE.Geometry();

    const {
      height,
      halfWidth,
      halfDepth
    } = this;

    /*
       3       2
        o-----o
        |     |  right
        |     |
        o-----o
       0       1
         front
     */
    geometry.vertices = [
      // Top-down counter-clockwise from front-left.
      new THREE.Vector3( -halfWidth, 0,  halfDepth ),
      new THREE.Vector3(  halfWidth, 0,  halfDepth ),
      new THREE.Vector3(  halfWidth, 0, -halfDepth ),
      new THREE.Vector3( -halfWidth, 0, -halfDepth ),
      // Top.
      new THREE.Vector3( 0, height, 0 )
    ];

    geometry.faces = [
      // Front.
      new THREE.Face3( 0, 1, 4 ),
      // Right.
      new THREE.Face3( 1, 2, 4 ),
      // Back.
      new THREE.Face3( 2, 3, 4 ),
      // Left.
      new THREE.Face3( 3, 0, 4 )
    ];

    return geometry;
  }

  createBone( geometry ) {
    vector.set( 0, this.height, 0 );
    rotateWorld( this, vector );

    const index = geometry.bones.push({
      parent: getParentBoneIndex( this ),
      name: 'pyramid',
      pos: vector.toArray(),
      rotq: [ 0, 0, 0, 1 ]
    }) - 1;

    this.index = index;

    times( 5, () => {
      geometry.skinIndices.push( new THREE.Vector4( index, 0, 0 ) );
      geometry.skinWeights.push( new THREE.Vector4( 1, 0, 0, 0 ) );
    });

    return geometry;
  }
}


export function transformGeometry( object, geometry ) {
  const { parent } = object;
  if ( !parent ) {
    return geometry;
  }

  const {
    parent: grandparent,
    matrix,
    matrixWorld
  } = parent;

  if ( !grandparent ) {
    matrixWorld.copy( matrix );
  } else {
    if ( parent.type === 'EquilateralTriangularPrism' ) {
      if ( object === parent.left  ) { parent.transformLeft();  }
      if ( object === parent.right ) { parent.transformRight(); }
    }

    matrixWorld.multiplyMatrices( grandparent.matrixWorld, matrix );
  }

  geometry.applyMatrix( matrixWorld );
  return geometry;
}


export default class Tree {
  constructor() {
    this.geometry = new THREE.Geometry();
    this.geometry.bones = [
      {
        parent: -1,
        name: 'root',
        pos: [ 0, 0, 0 ],
        rotq: [ 0, 0, 0, 1 ]
      }
    ];

    this.material = new THREE.MeshBasicMaterial({
      skinning: true,
      wireframe: true
    });

    this.mesh = new THREE.SkinnedMesh( this.geometry, this.material );
  }

  update() {}
}
