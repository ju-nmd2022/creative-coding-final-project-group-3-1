let strings = [];
let synth;
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
  for (let str of strings) {
    str.update();
    str.display();
  }

  stroke(255); 
  strokeWeight(25); 
  noFill();
  for (let wall of walls) {
    line(wall.x1, wall.y1, wall.x2, wall.y2);
  }
}

class StringObj {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = createVector(random(-2, 2), random(-2, 2));
    this.length = random(2000, 4000);
    this.thickness = random(4, 12);
    this.color = color(random(255), random(255), random(255));
    this.segments = [];
    this.freq = random(200, 800);
    this.synth = new Tone.Synth({
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.8,
        release: 0.5
      }
    }).toDestination();
    this.synth.triggerAttack(this.freq); 
  }

  update() {
    this.position.add(this.velocity);

    if (this.position.x < 0 || this.position.x > width) {
      this.velocity.x *= -1;
      this.position.x = constrain(this.position.x, 0, width);
      this.playBounceTone();
    }

    if (this.position.y < 0 || this.position.y > height) {
      this.velocity.y *= -1;
      this.position.y = constrain(this.position.y, 0, height);
      this.playBounceTone();
    }

    for (let wall of walls) {
      let d = dist(this.position.x, this.position.y, wall.x1, wall.y1);
      let d2 = dist(this.position.x, this.position.y, wall.x2, wall.y2);
      let lineLength = dist(wall.x1, wall.y1, wall.x2, wall.y2);
      if (d + d2 > lineLength - 2 && d + d2 < lineLength + 2) {
        let normalX = (wall.y2 - wall.y1) / lineLength;
        let normalY = (wall.x1 - wall.x2) / lineLength;

        let dotProduct = this.velocity.x * normalX + this.velocity.y * normalY;
        this.velocity.x -= 2 * dotProduct * normalX;
        this.velocity.y -= 2 * dotProduct * normalY;

        this.playBounceTone();
      }
    }
    this.segments.push(this.position.copy());
    while (this.segments.length > this.length / 10) {
      this.segments.shift();
    }
  }

  display() {
    stroke(this.color);
    strokeWeight(this.thickness);
    noFill();
    beginShape();
    for (let i = 0; i < this.segments.length; i++) {
      let segment = this.segments[i];
      curveVertex(segment.x, segment.y);
    }
    endShape();
  }

  playBounceTone() {
    this.freq = random(200, 800);
    this.synth.set({ frequency: this.freq });
  }
}

function defineMazePatterns() {
 mazePatterns.push([
    {x1: width/2-350, y1: height/2-350, x2: width/2+350, y2: height/2-350}, // Outside Top
    {x1: width/2+350, y1: height/2-250, x2: width/2+350, y2: height/2+250}, // Outside Right
    {x1: width/2+350, y1: height/2+350, x2: width/2-350, y2: height/2+350}, // Outside Bottom
    {x1: width/2-350, y1: height/2+250, x2: width/2-350, y2: height/2-250}, // Outside left

    {x1: width/2-250, y1: height/2-150, x2: width/2+150, y2: height/2-250},
    {x1: width/2+250, y1: height/2-150, x2: width/2+150, y2: height/2+250},
    {x1: width/2+250, y1: height/2+150, x2: width/2-150, y2: height/2+250},
    {x1: width/2-250, y1: height/2+150, x2: width/2-150, y2: height/2-250},

    {x1: width/2-50, y1: height/2-100, x2: width/2+50, y2: height/2-100},
    {x1: width/2+100, y1: height/2-50, x2: width/2+100, y2: height/2+50},
    {x1: width/2+50, y1: height/2+100, x2: width/2-50, y2: height/2+100},
    {x1: width/2-100, y1: height/2+50, x2: width/2-100, y2: height/2-50}
  ]);

  mazePatterns.push([
    {x1: width/2-350, y1: height/2-350, x2: width/2+350, y2: height/2-350},
    {x1: width/2+400, y1: height/2-250, x2: width/2+400, y2: height/2+250},
    {x1: width/2+350, y1: height/2+350, x2: width/2-350, y2: height/2+350}, 
    {x1: width/2-400, y1: height/2+250, x2: width/2-400, y2: height/2-250}, 

    {x1: width/2-150, y1: height/2-200, x2: width/2+150, y2: height/2-200},
    {x1: width/2+200, y1: height/2-150, x2: width/2+200, y2: height/2+150},
    {x1: width/2+150, y1: height/2+200, x2: width/2-150, y2: height/2+200},
    {x1: width/2-200, y1: height/2+150, x2: width/2-200, y2: height/2-50}
  ]);

  mazePatterns.push([
    {x1: width/2-350, y1: height/2-350, x2: width/2+350, y2: height/2-350}, 
    {x1: width/2+350, y1: height/2-250, x2: width/2+350, y2: height/2+250}, 
    {x1: width/2+350, y1: height/2+350, x2: width/2-350, y2: height/2+350}, 
    {x1: width/2-350, y1: height/2+250, x2: width/2-350, y2: height/2-250}, 

    {x1: width/2-250, y1: height/2-150 , x2: width/2+250, y2: height/2-150}, 
    {x1: width/2+250, y1: height/2-50, x2: width/2+250, y2: height/2+50}, 
    {x1: width/2+250, y1: height/2+150, x2: width/2-250, y2: height/2+150},
    {x1: width/2-250, y1: height/2+50, x2: width/2-250, y2: height/2-50}, 
  ]);

  mazePatterns.push([
    {x1: width/2+350, y1: height/2-250, x2: width/2+350, y2: height/2+250}, 
    {x1: width/2-350, y1: height/2+250, x2: width/2-350, y2: height/2-250}, 

    {x1: width/2+250, y1: height/2-250, x2: width/2+250, y2: height/2+250}, 
    {x1: width/2-250, y1: height/2+250, x2: width/2-250, y2: height/2-250}, 

    {x1: width/2+150, y1: height/2-250, x2: width/2+150, y2: height/2+250}, 
    {x1: width/2-150, y1: height/2+250, x2: width/2-150, y2: height/2-250}, 

    {x1: width/2+50, y1: height/2-250, x2: width/2+50, y2: height/2+250}, 
    {x1: width/2-50, y1: height/2+250, x2: width/2-50, y2: height/2-250}, 
  ]);

  mazePatterns.push([
    {x1: width/2-350, y1: height/2-350, x2: width/2+350, y2: height/2-350}, 
    {x1: width/2+350, y1: height/2+350, x2: width/2-350, y2: height/2+350}, 

    {x1: width/2-350, y1: height/2-150, x2: width/2+350, y2: height/2-350}, 
    {x1: width/2+350, y1: height/2+150, x2: width/2-350, y2: height/2+350}, 

    {x1: width/2-350, y1: height/2-150, x2: width/2+350, y2: height/2-0}, 
    {x1: width/2+350, y1: height/2+150, x2: width/2-350, y2: height/2+0}, 
  ]);

  mazePatterns.push([
    {x1: width/2-400, y1: height/2-400, x2: width/2+400, y2: height/2-400}, 
    {x1: width/2+400, y1: height/2-300, x2: width/2+400, y2: height/2+300}, 
    {x1: width/2+400, y1: height/2+400, x2: width/2-400, y2: height/2+400}, 
    {x1: width/2-400, y1: height/2+300, x2: width/2-400, y2: height/2-300}, 

    {x1: width/2-300, y1: height/2-300, x2: width/2+300, y2: height/2-300}, 
    {x1: width/2+300, y1: height/2-200, x2: width/2+300, y2: height/2+200}, 
    {x1: width/2+300, y1: height/2+300, x2: width/2-300, y2: height/2+300}, 
    {x1: width/2-300, y1: height/2+200, x2: width/2-300, y2: height/2-200}, 
 
    {x1: width/2-200, y1: height/2-200, x2: width/2+200, y2: height/2-200}, 
    {x1: width/2+200, y1: height/2-100, x2: width/2+200, y2: height/2+100}, 
    {x1: width/2+200, y1: height/2+200, x2: width/2-200, y2: height/2+200}, 
    {x1: width/2-200, y1: height/2+100, x2: width/2-200, y2: height/2-100}, 
    
    {x1: width/2-100, y1: height/2-100, x2: width/2+100, y2: height/2-100}, 
    {x1: width/2+100, y1: height/2-0, x2: width/2+100, y2: height/2+0}, 
    {x1: width/2+100, y1: height/2+100, x2: width/2-100, y2: height/2+100}, 
    {x1: width/2-100, y1: height/2+0, x2: width/2-100, y2: height/2-0}, 
  ]);
  
  mazePatterns.push([
    {x1: width/2-400, y1: height/2-400, x2: width/2+400, y2: height/2-400}, 
    {x1: width/2+400, y1: height/2-400, x2: width/2+400, y2: height/2+400}, 
    {x1: width/2+400, y1: height/2+400, x2: width/2-400, y2: height/2+400}, 
    {x1: width/2-400, y1: height/2+200, x2: width/2-400, y2: height/2-400}, 

    {x1: width/2-300, y1: height/2-300, x2: width/2+300, y2: height/2-300}, 
    {x1: width/2+300, y1: height/2-300, x2: width/2+300, y2: height/2+100}, 
    {x1: width/2+300, y1: height/2+300, x2: width/2-300, y2: height/2+300}, 
    {x1: width/2-300, y1: height/2+300, x2: width/2-300, y2: height/2-300}, 
 
    {x1: width/2-200, y1: height/2-200, x2: width/2+200, y2: height/2-200}, 
    {x1: width/2+200, y1: height/2-200, x2: width/2+200, y2: height/2+200}, 
    {x1: width/2+200, y1: height/2+200, x2: width/2-200, y2: height/2+200}, 
    {x1: width/2-200, y1: height/2+200, x2: width/2-200, y2: height/2-0}, 
    
    {x1: width/2-100, y1: height/2-100, x2: width/2+100, y2: height/2-100}, 
    {x1: width/2+100, y1: height/2-100, x2: width/2+100, y2: height/2+0}, 
    {x1: width/2+100, y1: height/2+100, x2: width/2-100, y2: height/2+100}, 
    {x1: width/2-100, y1: height/2+100, x2: width/2-100, y2: height/2-100}, 
  ]);

mazePatterns.push([
  {x1: width/2+400, y1: height/2-350, x2: width/2+0, y2: height/2+350},
  {x1: width/2-0, y1: height/2+350, x2: width/2-400, y2: height/2-350}, 

  {x1: width/2+0, y1: height/2-350, x2: width/2+400, y2: height/2+350},
  {x1: width/2-400, y1: height/2+350, x2: width/2-0, y2: height/2-350}, 
]);

mazePatterns.push([
  {x1: width/2-350, y1: height/2-350, x2: width/2+350, y2: height/2-350}, 
  {x1: width/2+350, y1: height/2-350, x2: width/2+350, y2: height/2+350}, 
  {x1: width/2+350, y1: height/2+350, x2: width/2-350, y2: height/2+350}, 
  {x1: width/2-350, y1: height/2+350, x2: width/2-350, y2: height/2-350}, 

  {x1: width/2-150, y1: height/2-150 , x2: width/2+150, y2: height/2-150}, 
  {x1: width/2+150, y1: height/2-150, x2: width/2+150, y2: height/2+150}, 
  {x1: width/2+150, y1: height/2+150, x2: width/2-150, y2: height/2+150},
  {x1: width/2-150, y1: height/2+150, x2: width/2-150, y2: height/2-150}, 

]);

mazePatterns.push([
  {x1: width/2-400, y1: height/2-400, x2: width/2+400, y2: height/2-400}, 
  {x1: width/2+400, y1: height/2-300, x2: width/2+400, y2: height/2+400}, 
  {x1: width/2+400, y1: height/2+400, x2: width/2-400, y2: height/2+400}, 
  {x1: width/2-400, y1: height/2+400, x2: width/2-400, y2: height/2-400}, 

  {x1: width/2-300, y1: height/2-300 , x2: width/2+300, y2: height/2-300}, 
  {x1: width/2+300, y1: height/2-200, x2: width/2+300, y2: height/2+300}, 
  {x1: width/2+300, y1: height/2+300, x2: width/2-300, y2: height/2+300},
  {x1: width/2-300, y1: height/2+300, x2: width/2-300, y2: height/2-300}, 

  {x1: width/2-200, y1: height/2-200, x2: width/2+200, y2: height/2-200}, 
  {x1: width/2+200, y1: height/2-100, x2: width/2+200, y2: height/2+200}, 
  {x1: width/2+200, y1: height/2+200, x2: width/2-200, y2: height/2+200},
  {x1: width/2-200, y1: height/2+200, x2: width/2-200, y2: height/2-200}, 

  {x1: width/2-100, y1: height/2-100, x2: width/2+100, y2: height/2-100}, 
  {x1: width/2+100, y1: height/2, x2: width/2+100, y2: height/2+100}, 
  {x1: width/2+100, y1: height/2+100, x2: width/2-100, y2: height/2+100},
  {x1: width/2-100, y1: height/2+100, x2: width/2-100, y2: height/2-100}, 

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
  strings.push(new StringObj(mouseX, mouseY));
}
