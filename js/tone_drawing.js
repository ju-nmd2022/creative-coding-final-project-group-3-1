let lines = [];
let isDrawing = false;
let walls = [];
let mazePatterns = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  Tone.start();
  defineMazePatterns();
  generateWalls();
}

function draw() {
  background(0);
  for (let line of lines) {
    if (line.shouldMove) {
      line.moveInDirection();
      line.checkEdges();
    }
    line.display();
  }

  stroke(255); 
  strokeWeight(25); 
  noFill();
  for (let wall of walls) {
    line(wall.x1, wall.y1, wall.x2, wall.y2);
  }
}

class Line {
  constructor(startX, startY) {
    this.start = createVector(startX, startY);
    this.end = createVector(startX, startY);
    this.thickness = random(1, 10);
    this.color = color(random(255), random(255), random(255));
    this.freq = random(200, 800);
    this.synth = new Tone.Synth({
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 1,
        release: 0.5
      }
    }).toDestination();
    this.synth.triggerAttack(this.freq);
    this.length = 0;
    this.movementVector = createVector(0, 0);
    this.speed = random(2, 4);
    this.shouldMove = false;
  }

  update(endX, endY) {
    this.end.set(endX, endY);
    this.length = p5.Vector.dist(this.start, this.end);
    this.movementVector = p5.Vector.sub(this.end, this.start).normalize().mult(this.speed);
  }

  moveInDirection() {
    this.start.add(this.movementVector);
    this.end.add(this.movementVector);
  }

  checkWalls() {
    for (let wall of walls) {
      let intersection = this.checkIntersection(wall);
      if (intersection) {
        this.movementVector.x *= -1;
        this.movementVector.y *= -1;
        this.movementVector.rotate(random(-PI / 6, PI / 6));
        this.start = intersection;
        this.end = intersection.copy().add(this.movementVector);
      }
    }
  }

  checkEdges() {
    let hitEdge = false;

    if (this.start.x < 0 || this.end.x < 0 || this.start.x > width || this.end.x > width) {
        this.movementVector.x *= -1;
        this.movementVector.rotate(random(-PI / 6, PI / 6));
        hitEdge = true;
    }

    if (this.start.y < 0 || this.end.y < 0 || this.start.y > height || this.end.y > height) {
        this.movementVector.y *= -1;
        this.movementVector.rotate(random(-PI / 6, PI / 6));
        hitEdge = true;
    }

    if (hitEdge) {
        this.start.x = constrain(this.start.x, 0, width);
        this.end.x = constrain(this.end.x, 0, width);
        this.start.y = constrain(this.start.y, 0, height);
        this.end.y = constrain(this.end.y, 0, height);
    }
}

checkIntersection(wall) {
  let x1 = wall.x1;
  let y1 = wall.y1;
  let x2 = wall.x2;
  let y2 = wall.y2;
  let x3 = this.start.x;
  let y3 = this.start.y;
  let x4 = this.end.x;
  let y4 = this.end.y;
  let denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (denominator === 0) {
    return null;
  }

  

  let t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  let u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

  if (t > 0 && t < 1 && u > 0) {
    return createVector(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
  } else {
    return null;
  }
}

  display() {
    stroke(this.color);
    strokeWeight(this.thickness);
    line(this.start.x, this.start.y, this.end.x, this.end.y);
  }
}

function defineMazePatterns() {
  mazePatterns.push([
    { x1: width / 2 - 350, y1: height / 2 - 350, x2: width / 2 + 350, y2: height / 2 - 350 },
    { x1: width / 2 + 350, y1: height / 2 - 250, x2: width / 2 + 350, y2: height / 2 + 250 },
  ]);
}

function generateWalls() {
  walls = [];
  let pattern = random(mazePatterns);
  for (let wall of pattern) {
    walls.push(wall);
  }
}

function mousePressed() {
  let newLine = new Line(mouseX, mouseY);
  lines.push(newLine);
  isDrawing = true;
}

function mouseDragged() {
  let currentLine = lines[lines.length - 1];
  currentLine.update(mouseX, mouseY);
}

function mouseReleased() {
  let currentLine = lines[lines.length - 1];
  currentLine.shouldMove = true;
  isDrawing = false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(0);
}
