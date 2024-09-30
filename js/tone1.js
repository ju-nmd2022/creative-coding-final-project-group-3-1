let lines = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  Tone.start();
}

function draw() {
  background(0);
  for (let line of lines) {
    line.display();
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
  }

  update(endX, endY) {
    this.end.set(endX, endY);
  }

  display() {
    stroke(this.color);
    strokeWeight(this.thickness);
    line(this.start.x, this.start.y, this.end.x, this.end.y);
  }
}

function mousePressed() {
  let newLine = new Line(mouseX, mouseY); 
  lines.push(newLine);
}

function mouseDragged() {
  let currentLine = lines[lines.length - 1];
  currentLine.update(mouseX, mouseY);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}