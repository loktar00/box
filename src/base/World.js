// Constants ----------------------------------------------------------------------
var EPSILON = 0.0001;


// Class ----------------------------------------------------------------------
function World(gravity, steps, iterations) {

    this.gravity = gravity || new Vector2(0.0, 50.0);
    this.steps = steps || 10;
    this.iterations = iterations || 10;

    this.interp = 1 / this.steps;

    // Active contacts between bodies
    this.contactCount = 0;
    this.contacts = [];

    // Object lists
    this.statics = [];
    this.dynamics = [];

}


// Statics --------------------------------------------------------------------
World.EPSILON = EPSILON;


// Methods --------------------------------------------------------------------
World.prototype = {

    update: function(dt) {

        // Perform the world update in smaller steps
        // This will reduce the amount of jitter when multiple objects
        // are stacked on top of each other
        var i, l;
        for(i = 0; i < this.steps; i++) {
            this.step(dt * this.interp);
        }

        // Reset the forces after all steps are done
        for(i = 0, l = this.dynamics.length; i < l; i++) {
            this.dynamics[i].clearForces();
        }

    },

    add: function(box) {
        if (box.im !== 0) {
            this.dynamics.push(box);

        } else {
            this.statics.push(box);
        }
    },

    remove: function(box) {
        this.statics.splice(this.statics.indexOf(box), 1);
        this.dynamics.splice(this.dynamics.indexOf(box), 1);
    },


    // Collision detection and resolution -------------------------------------

    /** @private */
    step: function(dt) {

        // Temporary variables
        var i, c,
            l = this.dynamics.length;

        // Find all collisions contacts for the current frame
        this.findContacts();

        // Integrate static forces into velocities and reset contacts
        for(i = 0; i < l; i++) {
            this.dynamics[i].integrateForces(dt, this.gravity);
        }

        // Setup collision manifolds
        for(c = 0; c < this.contactCount; c++) {
            this.contacts[c].setup(dt, this.gravity);
        }

        // Resolve the collisions based on the manifolds
        for(i = 0; i < this.iterations; i++) {
            for(c = 0; c < this.contactCount; c++) {
                this.contacts[c].resolveAllContacts();
            }
        }

        // Integrate the new velocities
        for(i = 0; i < l; i++) {
            this.dynamics[i].integrateVelocity(dt, this.gravity);
        }

        // Correct positions to prevent resting objects from sinking
        for(c = 0; c < this.contactCount; c++) {
            this.contacts[c].correctPositions();
        }

        // Update all objects with required information for rendering etc.
        for(i = 0; i < l; i++) {
            this.dynamics[i].update();
        }

    },

    /** @private */
    findContacts: function() {

        var dl = this.dynamics.length,
            sl = this.statics.length;

        // Manifolds are pooled, so we need to reset the length indicator
        this.contactCount = 0;

        // Go through all dynamics...
        for(var i = 0; i < dl; i++) {

            var a = this.dynamics[i];
            for(var j = 0; j < sl; j++) {
                this.checkAndSolveCollision(a, this.statics[j]);
            }

            for(j = i + 1; j < dl; j++) {
                this.checkAndSolveCollision(a, this.dynamics[j]);
            }

        }

    },

    /** @private */
    checkAndSolveCollision: function(a, b) {

        var m;
        if (testCollision(a, b)) {

            // Add a new manifold to the pool if required
            if (this.contacts.length === this.contactCount) {
                this.contacts.push((m = new Manifold()));

            // Otherwise use an existing one
            } else {
                m = this.contacts[this.contactCount];
            }

            // Validate the collision and response
            if (m.initializeWithBodies(a, b)) {
                this.contactCount++;
            }

        }

    }

};


// Public Exports -------------------------------------------------------------
Box.World = World;

