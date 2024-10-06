let strings = [];
let currentString = null;
let drawing = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  Tone.start();
}

function draw() {
  background(0);
  
  for (let str of strings) {
    str.update();
    str.display();
  }

  if (currentString) {
    currentString.display();
  }
}

class StringObj {
  constructor(x, y) {
    this.startPoint = createVector(x, y);
    this.endPoint = createVector(x, y);
    this.points = [createVector(x, y)];
    this.thickness = random(4, 12);
    this.color = color(random(255), random(255), random(255));
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
    this.velocity = createVector(0, 0);
    this.speed = 2;
  }

  calculateVelocity() {

    let start = this.points[0];
    let end = this.points[this.points.length - 1];
    this.velocity = p5.Vector.sub(end, start);
    this.velocity.normalize().mult(this.speed);
  }

  update() {
  
    if (this.velocity.mag() > 0) {
      let head = this.points[this.points.length - 1].copy();
      head.add(this.velocity.copy().mult(this.speed)); 
      this.points.push(head);

      // Länge der Linie
      if (this.points.length > 50) {
        this.points.shift();
      }

      // Kollision mit Bildschirmrändern prüfen
      if (head.x < 0 || head.x > width || head.y < 0 || head.y > height) {
        this.changeDirection();
        this.playBounceTone();
      }
    }
  }

  changeDirection() {

    let angle = random(TWO_PI);
    this.velocity = createVector(cos(angle), sin(angle)).mult(this.speed);
  }

  display() {

    noFill();
    stroke(this.color);
    strokeWeight(this.thickness);

    beginShape();
    for (let p of this.points) {
      vertex(p.x, p.y);
    }
    endShape();
  }

  playBounceTone() {
  
    this.freq = random(200, 800);
    this.synth.set({ frequency: this.freq });
  }

  stopTone() {
    this.synth.triggerRelease();
  }
}

function mousePressed() {
  currentString = new StringObj(mouseX, mouseY);
  drawing = true;
}

function mouseDragged() {

  if (drawing && currentString) {
    currentString.endPoint.set(mouseX, mouseY);
    currentString.points.push(createVector(mouseX, mouseY));
  }
}

function mouseReleased() {

  if (currentString) {
    currentString.calculateVelocity();
    strings.push(currentString);
    currentString = null;
  }
  drawing = false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}