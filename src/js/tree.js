class Tree {
  constructor( numBranches, trunk ) {
    this.numBranches = numBranches;
    this.branches = [];
    for ( let i = 0; i < 16; i++ ) {
      this.branches[i] = new Branch();
    }

    this.index = 0;
    this.trunkLength = 0;

    if ( trunk ) {
      const [ v0, v1, v2 ] = trunk;

      this.branches[ this.index ] = trunk;
      this.index++;
      this.trunkLength = dist(
        lerp( v0.x, v1.x, 0.5 ),
        lerp( v0.y, v1.y, 0.5 ),
        v2.x, v2.y
      );

      this.populateRandomBranches( this.branches[0], Math.random() );
    }
  }

  populateRandomBranches( trunk, sides ) {
    let side;
    if ( sides > 0.2 ) {
      side = 2;
    } else {
      side = Math.floor( Math.random() * 2 );
    }

    const [ v0, v1, v2 ] = trunk.vertices;

    const halfWidth  = canvas.width  / 2;
    const halfHeight = canvas.height / 2;

    if ( ( side === 1 || side === 2 ) && this.index < this.numBranches ) {
      const angle  = angleTo( v2, v0 ) + Math.random() * HALF_PI;
      const length = dist( v2.x, v2.y, v0.x, v0.y ) * 0.7;

      if ( length > ( this.trunkLength * 0.4 ) ) {
        // Check if the random angle will fit inside the circle.
        const xi = v2.x + length * Math.cos( angle );
        const yi = v2.y + length * Math.sin( angle );

        if ( dist( xi, yi, halfWidth, halfHeight ) < halfWidth ) {
          this.branches[ this.index ] = new Branch(
            new THREE.Vector3( v2.x, v2.y ),
            new THREE.Vector3(
              lerp( v2.x, v1.x, 0.3 ),
              lerp( v2.y, v1.y, 0.3 )
            ),
            new THREE.Vector3( xi, yi )
          );

          this.index++;
          this.populateRandomBranches(
            this.branches[ this.index - 1 ],
            Math.random()
          );
          // Check if the min or max angle fit inside the area.
        }
        else if (
          dist(
            v2.x + length * Math.cos( angleTo( v2, v0 ) + HALF_PI ),
            v2.y + length * Math.sin( angleTo( v2, v0 ) + HALF_PI ),
            halfWidth,
            halfHeight
          ) < halfWidth ||
          dist(
            v2.x + length * Math.cos( angleTo( v2, v0 ) ),
            v2.y + length * Math.sin( angleTo( v2, v0 ) ),
            halfWidth,
            halfHeight
          ) < halfWidth
        ) {
          this.populateRandomBranches( trunk, 1 );
        } // Otherwise, don't do it.
      }
    }

    if ( ( side === 0 || side === 2 ) && this.index < this.numBranches ) {
      const angle  = angleTo( v2, v1 ) - Math.random() * HALF_PI;
      const length = dist( v2.x, v2.y, v1.x, v1.y ) * 0.7;

      if ( length > ( this.trunkLength * 0.4 ) ) {
        // Check if the random angle will fit inside the circle.
        const xi = v2.x + length * Math.cos( angle );
        const yi = v2.y + length * Math.sin( angle );

        if ( dist( xi, yi, halfWidth, halfHeight ) < halfWidth ) {
          this.branches[ this.index ] = new Branch(
            new THREE.Vector3(
              lerp( v2.x, v0.x, 0.3 ),
              lerp( v2.y, v0.y, 0.3 )
            ),
            new THREE.Vector3( v2.x, v2.y ),
            new THREE.Vector3( xi, yi )
          );

          this.index++;
          this.populateRandomBranches(
            this.branches[ this.index - 1 ],
            Math.random()
          );
        }
        else if (
          dist(
            v2.x + length * Math.cos( angleTo( v2, v1 ) - HALF_PI ),
            v2.y + length * Math.sin( angleTo( v2, v1 ) - HALF_PI ),
            halfWidth,
            halfHeight
          ) < halfWidth ||
          dist(
            v2.x + length * Math.cos( angleTo( v2, v1 ) ),
            v2.y + length * Math.sin( angleTo( v2, v1 ) ),
            halfWidth,
            halfHeight
          ) < halfWidth
        ) {
          this.populateRandomBranches( trunk, 0 );
        }
      }
    }
  }

  reset() {
    this.index = 1;
    this.numBranches = game.numBranches;

    for ( let i = 1; i < this.numBranches; i++ ) {
      const branch = this.branches[i];
      branch.brightness = Math.floor( random( 50, 200 ) );
      branch.vertices[0].x = 0;
      branch.vertices[0].y = 0;
    }

    const startVertex = this.startVertex = Math.floor( Math.random() * this.numSides );

    const halfWidth      = this.layerWidth  / 2;
    const halfHeight     = this.layerHeight / 2;
    const halfRingWeight = this.ringWeight  / 2;

    const angle = TWO_PI / this.numSides;

    const angleA = angle * startVertex;
    const angleB = angle * ( startVertex - 1 );

    const ax = halfWidth  + ( halfWidth  - halfRingWeight ) * Math.cos( angleA );
    const ay = halfHeight + ( halfHeight - halfRingWeight ) * Math.sin( angleA );
    const bx = halfWidth  + ( halfWidth  - halfRingWeight ) * Math.cos( angleB );
    const by = halfHeight + ( halfHeight - halfRingWeight ) * Math.sin( angleB );

    const branch = this.branches[0] = new Branch(
      new THREE.Vector3( ax, ay ),
      new THREE.Vector3( bx, by ),
      new THREE.Vector3(
        lerp( ax, canvas.width / 2, 0.7 ),
        lerp( ay, canvas.width / 2, 0.7 )
      )
    );

    const [ v0, v1, v2 ] = branch.vertices;

    this.trunkLength = dist(
      lerp( v0.x, v1.x, 0.5 ),
      lerp( v0.y, v1.y, 0.5 ),
      v2.x, v2.y
    );

    this.populateRandomBranches( branch, 2 );
  }

  checkCollisions() {
    for ( let i = 0; i < this.numBranches; i++ ) {
      const branch = this.branches[i];
      if ( branch.vertices[0].x && branch.vertices[0].y ) {
        branch.playerOverlap();
      }
    }
  }

  render( ox, oy, w, h, easedDist ) {
    for ( let i = 0; i < this.numBranches; i++ ) {
      const branch = this.branches[i];
      if ( branch.vertices[0].x && branch.vertices[0].y ) {
        branch.setPos( ox, oy, w, h, easedDist );
        branch.render( ox, oy, w, h, easedDist );
      }
    }
  }
}