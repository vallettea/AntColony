'use strict';

var random = Math.random;
var floor = Math.floor;

var sign = require('./utilities.js').sign;
var calculateDistance = require('./utilities.js').distance;

var points = require('./initializePoints.js').points;
var citySet = require('./initializePoints.js').citySet;
var textPointsId = require('./initializePoints.js').textPointsId;
var possibleStartPointsId = require('./initializePoints.js').possibleStartPointsId;

var mouse = require('./mouse.js');

var Vector = require('./vector.js');


function Ant(point) {
    this.x = point.x;                
    this.y = point.y;
    this.velocity = 0.005;
    this.edge = undefined;
    this.state = "forage";
    this.edges = [];
    this.lastCity = undefined;
    this.origin = point;
    this.destination = undefined;
    this.orientation = undefined;
    this.direction = new Vector(0,0);
    this.prog = 0;
}
// forage: the ant wanders around without any pheromon deposition
// once it finds a city, it starts remembering the nodes it goes through
// when it finds another city, it computes the path length and adds pheromons one each edges
// proportionnaly to the shortestness of the path
// it resets the list of nodes and continues
// while foraging the ant choses the path with a pheromon preference


// static methods
Ant.generateRandStartPoint = function() {
    var randId = Math.floor(possibleStartPointsId.length * random());
    var randStartPoint = points[possibleStartPointsId[randId]];
    return randStartPoint;
}


// methods
Ant.prototype = {

    transit: function(){
        switch (this.state) {
        case "forage":
            var res = this.move();
            if (res.cityReached) {
                this.state = "pheromoning";
                this.lastCity = this.origin.id;
            };
            break;
        case "pheromoning":
            var res = this.move();
            if (res.edgeChanged) {
                this.edges.push(this.edge);
                // found a city
                if (res.cityReached && (this.origin.id != this.lastCity) ){
                    // compute the length of the path
                    var pathLength = this.edges.map(function(e){return e.distance}).reduce(function(a,b){return a + b});
                    var deltaPheromone = 1/pathLength;
                    this.edges.forEach(function(e){
                        var a = e.pt1, b = e.pt2, weight = 1;  
                        // increased dropped pheromons for textEdges
                        if (citySet.has(a.id) && citySet.has(b.id) && (Math.abs(a.id - b.id) == 1))
                        {
                            weight *= 10;
                        }
                        e.pheromon += (deltaPheromone * weight);
                    });

                    this.edges = [this.edge];
                    this.lastCity = this.origin.id;
                }
            }
          break;
        }

    },

    setDirection: function(){
        var possibleEdges = [];

        for (var i = 0; i < this.origin.nexts.length; i++)
        {
            possibleEdges[i] = this.origin.nexts[i];
        } 

        possibleEdges.splice(possibleEdges.indexOf(this.edge),1);

        // flip a coin and either take the smelliest path or a random one
        if (random() > 0.5){
            var smells = possibleEdges.map(function(e){return e.pheromon});
            var index = smells.indexOf(Math.max.apply(Math, smells));
            this.edge = possibleEdges[index];
        } 
        else
            this.edge = possibleEdges[floor(random()*possibleEdges.length)];

        // set the destination point, being edge.pt1 or edge.pt2
        this.destination = (this.origin == this.edge.pt1) ? this.edge.pt2 : this.edge.pt1;

        this.direction.x = this.destination.x - this.origin.x; 
        this.direction.y = this.destination.y - this.origin.y;

        this.direction.normalize();
    },

    move: function(){
        var edgeChanged;
        var cityReached = false;

        this.direction.x = this.destination.x - this.x; 
        this.direction.y = this.destination.y - this.y;
        this.direction.normalize();

        // on edge
        // if ((this.prog < this.edge.distance) || (calculateDistance(this, this.destination) > 0.001){
        if ((calculateDistance(this, this.destination) > 0.005)){

            // a delta movement will be applied if collision with obstacle detected
            var delta = this.avoidObstacle();

            this.x += this.velocity * this.direction.x + delta.x * 0.005;
            this.y += this.velocity * this.direction.y + delta.y * 0.005;

            this.prog = this.calculateProgression();
            // this.prog = calculateDistance(this, this.origin);
            //console.log(this.prog / this.edge.distance);
            
            edgeChanged = false;

        // on vertex
        } else {
            this.step = 0;
            this.prog = 0;
            this.origin = this.destination;
            this.x = this.origin.x;
            this.y = this.origin.y;

            this.setDirection();

            cityReached = citySet.has(this.origin.id);
            edgeChanged = true;
        }
        return {cityReached: cityReached, edgeChanged: edgeChanged};
    },

    avoidObstacle: function(){
        var distance = calculateDistance(this, mouse);
        //var distanceEdge = this.edge.calculateDistance(this.x, this.y);
    
        if (distance <= mouse.r)
        {
            // if (distanceEdge > 0.01){
            //     this.direction.x = this.destination.x - this.x; 
            //     this.direction.y = this.destination.y - this.y;
            //     this.direction.normalize();
            // }

            return {
                // delta movement is composed of a repulsion delta and a circular delta 
                x: (this.x - mouse.x)/distance + (this.y - mouse.y)/distance * 1,
                y: (this.y - mouse.y)/distance - (this.x - mouse.x)/distance * 1
                // x: (this.x - mouse.x)/distance + (this.y - mouse.y)/distance * 1 + 0.1 * this.direction.x,
                // y: (this.y - mouse.y)/distance - (this.x - mouse.x)/distance * 1 + 0.1 * this.direction.y 
            };
        }
        else
            return {x:0, y:0};
    },

    calculateProgression: function(){
        var v = new Vector(this.x - this.origin.x, this.y - this.origin.y);
        var norm = v.norm();

        var theta = (v.x * this.edge.direction.x + v.y * this.edge.direction.y) / norm;
        var prog = norm * Math.abs(theta);
        // returns length of projection on edge
        return prog;
    }

};

module.exports = Ant;