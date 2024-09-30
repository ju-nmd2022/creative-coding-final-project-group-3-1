let strings = [];
let synth;

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

function mousePressed() {
  if (strings.length < 10) {
    let newString = new StringObj(mouseX, mouseY);
    strings.push(newString);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
