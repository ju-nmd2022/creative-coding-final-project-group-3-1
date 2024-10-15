let simulationFrameRate = 60; // frame rate
let strings = []; // the pinchies stay here
let walls = []; // the walls on the screen at any point
let mazePatterns = []; // this is maze patters. it doesn't do anything
let scale; // the scale that the little pinchies choose their notes from
// let notes = ["C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4"]; // pre-coded notes for our piano sampler
let masterVolume = 15; // master volume that controls the outputs of the entire sound system
let handPose; // detects our hands
let video; // video output from handPose
let hands = []; // our detected fingers
let cursorState = "idle"; // could be 'idle', 'selecting', or 'creating'
let newLine = null; // when dragging the mouse to create a new line, we need this
let globalSpeed; // the default speed of a pinchy
let someonePinched = false; // the simulation detects if a pinchy is pinched and it tells the others
let pinchSelectThreshold = 200; // how tigh our pinch is to be considered a selection
let pinchThreshold = 80; // how tigh should our pinch be to actually hold a pinchy in place
let pinchDistanceThreshold = 80; // how far should our pinch be to affect a pinchy

function preload() {
  // Load the handPose model
  handPose = ml5.handPose({
    flipped: true,
  });
}

function setup() {
  createCanvas(windowHeight * 4 / 3, windowHeight);
  frameRate(simulationFrameRate);

  globalSpeed = random(2, 4);

  // Create the webcam video and hide it
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();
  // Start detecting hands from the webcam video
  handPose.detectStart(video, gotHands);

  background(128);
  Tone.start();
  scale = Tonal.Scale.get("C3 major").notes; // get the notes of a certain scale and put in the "scale" array
  defineMazePatterns();
  generateWalls();

  Tone.Master.volume.value = masterVolume; // changing the master volume (last link of the chain)

  setInterval(changeMazePattern, random(20000, 30000));
}

function draw() {
  let isSelecting = false;
  let handsData = getHandsData();

  background(15);

  for(string of strings){
    isSelecting |= string.selected;
  }
  switch(cursorState){
    case "idle":
      if(isSelecting){
        cursorState = "selecting";
      }
      break;
    case "selecting":
      if(!isSelecting){
        cursorState = "idle";
      }
      break;
    case "creating":
      if(newLine != null){
        newLine.display();
      }
      break;
  }
  
  ////////////////////////////////////////////////////////////// DEBUGGING cursor state based on SELECTION or CREATION
  // switch(cursorState){ // change background color depending on whether we're creating, selecting, or doing nothing
  //   case "idle":
  //     background(0);
  //     break;
  //   case "selecting":
  //     background(220, 0, 0);
  //     break;
  //   case "creating":
  //     background(20);
  //     break;
  // }
  ////////////////////////////////////////////////////////////// DEBUGGING cursor state based on SELECTION or CREATION

  // Draw the webcam video
  //image(video, 0, 0, width, height); // let's comment this out and not draw the video hehe

  for (let string of strings) {
    for(let i = 0; i < strings.length; i++){ // checking if a string's life has ended
      if(strings[i].segments.length == 1){
        strings[i].synth.triggerRelease();
        strings.splice(i, 1);        
      }
    }
    string.update(handsData);
    string.display();
  }

  // draw the walls
  stroke(255, 0, 150); 
  strokeWeight(5);
  noFill();

  for (let wall of walls) {
    line(wall.x1, wall.y1, wall.x2, wall.y2);
  }

  checkForPinch(handsData);
}

function getHandsData(){
  // If there is at least one hand
  if (hands.length > 0) {
    // Find the index finger tip and thumb tip
    let finger = hands[0].index_finger_tip;
    let thumb = hands[0].thumb_tip;

    // Draw circles at finger positions
    let centerX = (finger.x + thumb.x) / 2;
    let centerY = (finger.y + thumb.y) / 2;
    // Calculate the pinch "distance" between finger and thumb
    let pinch = dist(finger.x, finger.y, thumb.x, thumb.y);

    return {
      centerX: centerX,
      centerY, centerY,
      pinch, pinch
    }
  }else{
    return false;
  }
}

class Line {
  constructor(x, y) {
    this.startCoordinates = createVector(x, y);
    this.endCoordinates = createVector(x, y);  // Represents the head of the line
    this.velocity = createVector(0, 0);
    this.speed = globalSpeed;
    this.length = 0;
    this.thickness = random(4, 12);
    this.color = color(random(255), random(255), random(255));
    this.segments = [];
  }

  display() {
    // Draw the line itself
    stroke(this.color);
    strokeWeight(this.thickness);
    noFill();
    line(this.startCoordinates.x, this.startCoordinates.y, this.endCoordinates.x, this.endCoordinates.y);

    // Draw the head of the moving line as a circle
    fill(255);  // Set fill color to white for the head
    noStroke();  // No stroke for the circle head
    let headRadius = this.thickness + 5;  // Adjust the size of the head based on the line thickness
    ellipse(this.endCoordinates.x, this.endCoordinates.y, headRadius);  // Draw the circle at the front (head)
  }
}

class StringObj {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = createVector(random(-2, 2), random(-2, 2));
    this.direction;
    this.length = random(2000, 4000);
    this.thickness = random(4, 12);
    this.color = color(random(255), random(255), random(255));
    this.segments = [];
    this.frozen = false;
    this.scared = false;
    this.shape = random(['line', 'triangle', 'circle']);

    this.freq = random(scale);//random(200, 800);  // pick a random note from the predefined scale
    this.synth = new Tone.AMSynth({
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.8,
        release: 0.5
      }
    }).toDestination();
    // this.synth.triggerAttackRelease(this.freq, "8n"); // play the note only for an 8th note
    this.synth.oscillator.type = "sine"; // changing the synthesizer's oscillator type
    this.synth.triggerAttack(this.freq); // play sound indefinitely

    ////////////////////////////////////////////////////////////// SAMPLER for PIANO NOTES
    // this.note = random(notes);
    // this.sampler = new Tone.Sampler({
    //   urls: {
    //     C4: "C4.mp3",
    //     D4: "Ds4.mp3",
    //     F4: "Fs4.mp3",
    //     A4: "A4.mp3",
    //   },
    //   baseUrl: "https://tonejs.github.io/audio/salamander/",
    //   release: 1,
    //   // onload: () => console.log('Sampler loaded')
    // }).toDestination();

    // Tone.loaded().then(() => {
    //   this.sampler.triggerAttackRelease(this.note, '8n');
    // });
    ////////////////////////////////////////////////////////////// SAMPLER for PIANO NOTES
  }
    
  update(data) {
    this.velocity = this.velocity.normalize().mult(this.speed); // velocity is controlled by speed and direction
    this.position.add(this.velocity); // the head crawls to the new position based on creature's velocity
    this.scared = someonePinched;

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
      let lineLength = dist(wall.x1, wall.y1, wall.x2, wall.y2);
      let nextPosition = this.position.copy().add(this.velocity);

      if (intersects(this.position.x, this.position.y, nextPosition.x, nextPosition.y, wall.x1, wall.y1, wall.x2, wall.y2)) { // original content of the conditional: (distanceFromWall - lineLength) <= 0.2
        // let lineXVector = wall.x2 - wall.x1;
        // let lineYVector = wall.y2 - wall.y1;
        // let theDotProduct = lineXVector * this.velocity.x + lineYVector * this.velocity.y;
        // let lineMagnitude = Math.sqrt(Math.pow(lineXVector, 2) + Math.pow(lineYVector, 2));
        // let velocityMagnitude = Math.sqrt(Math.pow(this.velocity.x, 2) + Math.pow(this.velocity.y, 2));

        // console.log(" lineX" + lineXVector);
        // console.log(" lineY" + lineYVector);
        // console.log(" dot product" + theDotProduct);
        // console.log(" line magnitude" + lineMagnitude);
        // console.log(" velocity magnitude" + velocityMagnitude);

        // let angle = Math.acos(theDotProduct / (lineMagnitude * velocityMagnitude));
        // let angleMagnitude = Math.abs((angle * 180) / PI);

        // if(angleMagnitude % 180 == 0){
        //   this.velocity.x = -this.velocity.x;
        //   this.velocity.y = -this.velocity.y;
        // }
        // else{
          let normalX = (wall.y2 - wall.y1) / lineLength;
          let normalY = (wall.x1 - wall.x2) / lineLength;
          
          let dotProduct = this.velocity.x * normalX + this.velocity.y * normalY;
          
          this.velocity.x -= 2 * dotProduct * normalX;
          this.velocity.y -= 2 * dotProduct * normalY;
        // }

        this.playBounceTone();
      }
    }    
    
    if(!this.frozen){ // move the string only if it is not frozen
      this.segments.push(this.position.copy());
      // console.log("segments: " + this.segments.length + " speed: " + this.speed + " length: " + this.length);
      
      // while (this.segments.length * this.speed > this.length) {
        this.segments.shift();
        
      // }

      if(frameCount % simulationFrameRate == simulationFrameRate - 1){ // do this every one second that passes
        // console.log("1 second passed of my life, and I have " + this.segments.length + " segments!");
        this.segments.shift(); // take one segment away from the string's life
        if(someonePinched){ // randomly move around in confusion if another pinchy is pinched
          if(data != false){
            if((dist(data.centerX, data.centerY, this.position.x, this.position.y) < 300) && data.pinch <= pinchSelectThreshold){
              this.velocity = createVector(random(-2, 2), random(-2, 2)); // move around in a random direction, cause it is scared
              // let newNote = this.freq.slice(0, 1) + "" + (parseInt(this.freq.slice(1, 2)) + 1);

              // console.log("My new note is " + newNote + " :)");
              // this.sampler.triggerAttackRelease(newNote, '8n'); // make its noise but an octave higher, cause it is stressed
              this.synth.triggerAttack(this.freq * 2);
            }
          }
        }
      }

      this.direction = Math.atan(this.velocity.y / this.velocity.x);
    }

    if(dist(mouseX, mouseY, this.position.x, this.position.y) <= 20) // check if the mouse pointer is near the head
    {
      this.selected = true;
    }
    else 
    {
      this.selected = false;
    }

    if(data != false){
      if((dist(data.centerX, data.centerY, this.position.x, this.position.y) <= pinchDistanceThreshold) && data.pinch <= pinchSelectThreshold){
        this.speed = globalSpeed *3;
        this.selected = true;
      }        
      else if((dist(data.centerX, data.centerY, this.position.x, this.position.y) < 300) && data.pinch <= pinchSelectThreshold)
        this.speed = globalSpeed *2;
      else{
        this.speed = globalSpeed;
        this.selected = false;
      }
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
  
    // Draw the shape
    fill(this.color);
    let x = this.segments[this.segments.length - 1].x;
    let y = this.segments[this.segments.length - 1].y;
    
    push();

    translate(x, y);
    if(this.velocity.x >= 0)
      rotate(this.direction + PI);
    else if(this.velocity.x < 0)
      rotate(this.direction);
    
    if (this.shape === 'line') {
      // Draw a line
      line(0, 0, 20, 0);
    } else if (this.shape === 'triangle') {
      // Draw a triangle
      let triangleSize = 20;
      triangle(0, -triangleSize / 2, 20, 0, 0, triangleSize / 2);
    } else if (this.shape === 'circle') {
      // Draw a circle
      let circleSize = 20;
      ellipse(10, 0, circleSize, circleSize);
    } else if (this.shape === 'square') {
      // Draw a square
      let squareSize = 20;
      rect(-squareSize / 2, -squareSize / 2, squareSize, squareSize);
    } else if (this.shape === 'pentagon') {
      // Draw a pentagon
      let pentagonSize = 20;
      beginShape();
      for (let i = 0; i < 5; i++) {
        let px = cos(i * PI / 2.5) * pentagonSize;
        let py = sin(i * PI / 2.5) * pentagonSize;
        vertex(px, py);
      }
      endShape(CLOSE);
    } else if (this.shape === 'hexagon') {
      // Draw a hexagon
      let hexagonSize = 20;
      beginShape();
      for (let i = 0; i < 6; i++) {
        let px = cos(i * PI / 3) * hexagonSize;
        let py = sin(i * PI / 3) * hexagonSize;
        vertex(px, py);
      }
      endShape(CLOSE);
    }
    
    pop();
  
    // draw the head of the string
    fill(255);
    noStroke();
  
    // if the mouse is on the head of the string, make the eyes poppy and distinguishable
    let eyePop = this.selected == true? 6 : 0;
    
    push();
    translate(this.segments[this.segments.length - 1].x, this.segments[this.segments.length - 1].y);
    if(this.velocity.x >= 0)
      rotate(this.direction);
    else if(this.velocity.x < 0)
      rotate(this.direction + PI); // because Arctan always returns an angle between -PI/2 and PI/2
    // make the eyes
    ellipse(0, -10, 20);
    ellipse(0, 10, 20);
    // make the black of the eyes
    strokeWeight(1);
    stroke(255);
    fill(0);
    ellipse(5, -10, 14 + eyePop);
    ellipse(5, 10, 14 + eyePop);
    // make the spark in the eyes
    fill(255);
    ellipse(0, -10, 8 + eyePop / 2);
    ellipse(0, 10, 8 + eyePop / 2);
    pop();
  }

  playBounceTone() {
    // this.freq = random(scale); //random(200, 800); // pick a random note from the predefined scale
    // this.synth.set({ frequency: this.freq });

    //this.synth.triggerAttackRelease(this.freq, "8n"); // play the note only for an 8th note
    this.freq = random(200, 800);
    this.synth.set({ frequency: this.freq });
    // this.sampler.triggerAttack Release(this.note, '8n');

  }
}

function defineMazePatterns() {
  
  mazePatterns.push([
    {x1: width/2-400, y1: height/2-400, x2: width/2+400, y2: height/2-400},
    {x1: width/2+400, y1: height/2-400, x2: width/2+400, y2: height/2+0},
    {x1: width/2+400, y1: height/2+400, x2: width/2-400, y2: height/2+400},
    {x1: width/2-400, y1: height/2+400, x2: width/2-400, y2: height/2-0},

    {x1: width/2-300, y1: height/2-300, x2: width/2+300, y2: height/2-300},
    {x1: width/2+300, y1: height/2-300, x2: width/2+300, y2: height/2+0},
    {x1: width/2+300, y1: height/2+300, x2: width/2-300, y2: height/2+300},
    {x1: width/2-300, y1: height/2+300, x2: width/2-300, y2: height/2-0},
   
    {x1: width/2-200, y1: height/2-200, x2: width/2+200, y2: height/2-200},
    {x1: width/2+200, y1: height/2-200, x2: width/2+200, y2: height/2+0},
    {x1: width/2+200, y1: height/2+200, x2: width/2-200, y2: height/2+200},
    {x1: width/2-200, y1: height/2+200, x2: width/2-200, y2: height/2-0},
    
    {x1: width/2-100, y1: height/2-100, x2: width/2+100, y2: height/2-100},
    {x1: width/2+100, y1: height/2-100, x2: width/2+100, y2: height/2+0},
    {x1: width/2+100, y1: height/2+100, x2: width/2-100, y2: height/2+100},
    {x1: width/2-100, y1: height/2+100, x2: width/2-100, y2: height/2-0},

  ]);

  
  mazePatterns.push([
    {x1: width/2+350, y1: height/2-350, x2: width/2+350, y2: height/2+350},
    {x1: width/2+350, y1: height/2+350, x2: width/2-350, y2: height/2+350},
    {x1: width/2-350, y1: height/2+350, x2: width/2-350, y2: height/2-350},

    {x1: width/2-200, y1: height/2-350, x2: width/2+200, y2: height/2-350},
    {x1: width/2+200, y1: height/2-350, x2: width/2+200, y2: height/2+200},
    {x1: width/2-200, y1: height/2+200, x2: width/2-200, y2: height/2-350},

    {x1: width/2+50, y1: height/2-200, x2: width/2+50, y2: height/2+200},
    {x1: width/2+50, y1: height/2+200, x2: width/2-50, y2: height/2+200},
    {x1: width/2-50, y1: height/2+200, x2: width/2-50, y2: height/2-200},
  ]);

  mazePatterns.push([
    {x1: width/2-350, y1: height/2-350, x2: width/2+350, y2: height/2-350},
    {x1: width/2+400, y1: height/2-250, x2: width/2+400, y2: height/2+250},
    {x1: width/2+350, y1: height/2+350, x2: width/2-350, y2: height/2+350}, 
    {x1: width/2-400, y1: height/2+250, x2: width/2-400, y2: height/2-250}, 

    {x1: width/2-150, y1: height/2-200, x2: width/2+150, y2: height/2-200},
    {x1: width/2+200, y1: height/2-150, x2: width/2+200, y2: height/2+150},
    {x1: width/2+150, y1: height/2+200, x2: width/2-150, y2: height/2+200},
    {x1: width/2-200, y1: height/2+150, x2: width/2-200, y2: height/2-150}
  ]);

  mazePatterns.push([
    {x1: width/2-350, y1: height/2-400, x2: width/2+350, y2: height/2-400},
    {x1: width/2+400, y1: height/2-350, x2: width/2+400, y2: height/2+350},
    {x1: width/2+350, y1: height/2+400, x2: width/2-350, y2: height/2+400},
    {x1: width/2-400, y1: height/2+350, x2: width/2-400, y2: height/2-350},

    {x1: width/2-250, y1: height/2-300, x2: width/2+250, y2: height/2-300},
    {x1: width/2+300, y1: height/2-250, x2: width/2+300, y2: height/2+250},
    {x1: width/2+250, y1: height/2+300, x2: width/2-250, y2: height/2+300},
    {x1: width/2-300, y1: height/2+250, x2: width/2-300, y2: height/2-250},

    {x1: width/2-150, y1: height/2-200, x2: width/2+150, y2: height/2-200},
    {x1: width/2+200, y1: height/2-150, x2: width/2+200, y2: height/2+150},
    {x1: width/2+150, y1: height/2+200, x2: width/2-150, y2: height/2+200},
    {x1: width/2-200, y1: height/2+150, x2: width/2-200, y2: height/2-150},

    {x1: width/2-50, y1: height/2-100, x2: width/2+50, y2: height/2-100},
    {x1: width/2+100, y1: height/2-50, x2: width/2+100, y2: height/2+50},
    {x1: width/2+50, y1: height/2+100, x2: width/2-50, y2: height/2+100},
    {x1: width/2-100, y1: height/2+50, x2: width/2-100, y2: height/2-50},
  ]);

  mazePatterns.push([
    {x1: width/2-450, y1: height/2-350, x2: width/2+450, y2: height/2-350}, 
    {x1: width/2+450, y1: height/2-250, x2: width/2+450, y2: height/2+250}, 
    {x1: width/2+450, y1: height/2+350, x2: width/2-450, y2: height/2+350}, 
    {x1: width/2-450, y1: height/2+250, x2: width/2-450, y2: height/2-250}, 

    {x1: width/2-250, y1: height/2-150 , x2: width/2+250, y2: height/2-150}, 
    {x1: width/2+250, y1: height/2-50, x2: width/2+250, y2: height/2+50}, 
    {x1: width/2+250, y1: height/2+150, x2: width/2-250, y2: height/2+150},
    {x1: width/2-250, y1: height/2+50, x2: width/2-250, y2: height/2-50}, 
  ]);

  mazePatterns.push([
    {x1: width/2+450, y1: height/2-350, x2: width/2+450, y2: height/2+350}, 
    {x1: width/2-450, y1: height/2+350, x2: width/2-450, y2: height/2-350}, 

    {x1: width/2+300, y1: height/2-350, x2: width/2+300, y2: height/2+350}, 
    {x1: width/2-300, y1: height/2+350, x2: width/2-300, y2: height/2-350}, 

    {x1: width/2+150, y1: height/2-350, x2: width/2+150, y2: height/2+350}, 
    {x1: width/2-150, y1: height/2+350, x2: width/2-150, y2: height/2-350}, 

    {x1: width/2-0, y1: height/2+350, x2: width/2-0, y2: height/2-350}, 

  ]);

mazePatterns.push([
  {x1: width/2-450, y1: height/2-300, x2: width/2+450, y2: height/2-300}, 
  {x1: width/2+450, y1: height/2+300, x2: width/2-450, y2: height/2+300}, 

  {x1: width/2-450, y1: height/2-150, x2: width/2+450, y2: height/2-150}, 
  {x1: width/2+450, y1: height/2+150, x2: width/2-450, y2: height/2+150}, 

  {x1: width/2+450, y1: height/2+0, x2: width/2-450, y2: height/2+0}, 
]);

mazePatterns.push([
  {x1: width/2-450, y1: height/2-400, x2: width/2+450, y2: height/2-400}, 
  {x1: width/2+450, y1: height/2-400, x2: width/2+450, y2: height/2+400}, 
  {x1: width/2+450, y1: height/2+400, x2: width/2-450, y2: height/2+400}, 
  {x1: width/2-450, y1: height/2+200, x2: width/2-450, y2: height/2-400}, 

  {x1: width/2-250, y1: height/2-300, x2: width/2+250, y2: height/2-300}, 
  {x1: width/2+250, y1: height/2-300, x2: width/2+250, y2: height/2+100}, 
  {x1: width/2+250, y1: height/2+300, x2: width/2-250, y2: height/2+300}, 
  {x1: width/2-250, y1: height/2+300, x2: width/2-250, y2: height/2-300}, 

  {x1: width/2-100, y1: height/2-100, x2: width/2+ 0, y2: height/2-100}, 
  {x1: width/2+100, y1: height/2-100, x2: width/2+100, y2: height/2+100}, 
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
  {x1: width/2-250, y1: height/2-250, x2: width/2+250, y2: height/2-250}, 
  {x1: width/2+250, y1: height/2-250, x2: width/2+250, y2: height/2+250}, 
  {x1: width/2+250, y1: height/2+250, x2: width/2-250, y2: height/2+250}, 
  {x1: width/2-250, y1: height/2+250, x2: width/2-250, y2: height/2-250}, 

]);
}

function changeMazePattern() {
  generateWalls(); 
}

function generateWalls() {
  walls = [];
  let randomPattern = random(mazePatterns);
  for (let wall of randomPattern) {
    if (wall.x1 >= 0 && wall.x1 <= width && wall.x2 >= 0 && wall.x2 <= width && wall.y1 >= 0 && wall.y1 <= height && wall.y2 >= 0 && wall.y2 <= height) {
      walls.push(wall);
    }
  }
}

function mousePressed() {
  if (cursorState == "selecting") {
    for (let i = 0; i < strings.length; i++) {
      if (strings[i].selected) {
        strings[i].frozen = !strings[i].frozen;
        if (strings[i].frozen) {
          strings[i].velocity.set(0, 0);
          strings[i].synth.volume.value -= 10;
          strings[i].synth.triggerAttack(strings[i].freq);

          // strings[i].sampler.triggerAttack(strings[i].note);
        } else {
          strings[i].velocity.set(random(-2, 2), random(-2, 2));   
          strings[i].synth.volume.value = 1;
          // strings[i].synth.triggerRelease();

          // strings[i].sampler.triggerRelease();
        }
        return;
      }
    }
  } else if (cursorState == "idle" && !isNearWall(mouseX, mouseY)) {
    // Only create a new line if the starting point is not near a wall
    cursorState = "creating";
    newLine = new Line(mouseX, mouseY);
  }
}

function mouseDragged() {
  if (cursorState == "creating") {
    if (!isNearWall(mouseX, mouseY)) {
      newLine.endCoordinates.x = mouseX;
      newLine.endCoordinates.y = mouseY;
    }
  }
}

function mouseReleased(){
  if(cursorState == "creating"){
    if (isNearWall(newLine.endCoordinates.x, newLine.endCoordinates.y)) {
      newLine = null;
      cursorState = "idle";
      return;
    }
    newLine.length = p5.Vector.dist(newLine.startCoordinates, newLine.endCoordinates);
    
    let numberOfSegments = Math.ceil(newLine.length / newLine.speed);
    if(numberOfSegments <= 1){
      newLine = null;
      cursorState = "idle";
      return;
    }

    newLine.velocity = p5.Vector.sub(newLine.endCoordinates, newLine.startCoordinates).normalize().mult(newLine.speed);
    
    for(let i = 0; i < numberOfSegments; i++){
      newLine.segments[numberOfSegments - i] = createVector(
        newLine.endCoordinates.x - newLine.velocity.x * i,
        newLine.endCoordinates.y - newLine.velocity.y * i);
    }
    newLine.segments[0] = createVector(newLine.startCoordinates.x, newLine.startCoordinates.y);

    let newString = new StringObj(newLine.endCoordinates.x, newLine.endCoordinates.y);
    newString.velocity = newLine.velocity;
    newString.speed = newLine.speed;
    newString.length = newLine.length;
    newString.thickness = newLine.thickness;
    newString.color = newLine.color;
    newString.segments = newLine.segments;
    strings.push(newString);

    newLine = null;
  }
  cursorState = "idle";
}


function keyPressed(){ // do something if a key on the keyboard is pressed
  if(keyCode === BACKSPACE){
    for(let i = 0; i < strings.length; i++){
      if(strings[i].selected == true){

        strings[i].synth.triggerRelease(); // when removing a string, stop the sound it is making

        // strings[i].sampler.triggerRelease();

        strings.splice(i, 1); // remove the string altogether
        cursorState = "idle";
        return;
      }
    }
  }
  else if(keyCode === DELETE){ // if DELETE is pressed, remove all the strings
    for(string of strings){
      string.synth.triggerRelease();
      // string.sampler.triggerRelease();
    }
    strings.splice(0, strings.length);
  }
}

function isNearWall(x, y) {
  for (let wall of walls) {
    let wallLength = dist(wall.x1, wall.y1, wall.x2, wall.y2);
    let distanceFromWall = dist(x, y, wall.x1, wall.y1) + dist(x, y, wall.x2, wall.y2);
    
    if (Math.abs(distanceFromWall - wallLength) < 10) {
      return true;
    }
  }
  return false;
}

function checkForPinch(data){
  if(data != false){
    // draw the effective pinch area
    stroke(255);
    strokeWeight(2);
    circle(data.centerX, data.centerY, data.pinch);

    // check if a pinchy is inside the pinch area
    for(let i = 0; i < strings.length; i++){
      if(strings[i].selected == true){
        if(data.pinch <= pinchThreshold){
          if(!strings[i].frozen){
            strings[i].speed = 0; // when a creature is frozen, it just stands there. it doesn't do anything
            strings[i].synth.volume.value -= 10;

            strings[i].synth.triggerAttack(strings[i].freq); // when frozen, a string makes sound permanently

            // strings[i].sampler.triggerAttack(strings[i].note);
            strings[i].frozen = true;
          }         
          someonePinched = true;
        }else{
          if(strings[i].frozen){
            strings[i].velocity.set(random(-2, 2), random(-2, 2));   

            // strings[i].synth.triggerRelease();
            strings[i].synth.volume.value = 1;
            // strings[i].sampler.triggerRelease();
          }
          strings[i].frozen = false;
          someonePinched = false;
        }
      }else{
        if(strings[i].frozen){
          strings[i].velocity.set(random(-2, 2), random(-2, 2));   

          // strings[i].synth.triggerRelease();
          strings[i].synth.volume.value = 1;
          // strings[i].sampler.triggerRelease();
          strings[i].frozen = false;
          someonePinched = false;
        }
      }
    }
  }
}

// Callback function for when handPose outputs data
function gotHands(results) {
  // Save the output to the hands variable
  hands = results;
}

// returns true if the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
function intersects(a,b,c,d,p,q,r,s) {
  var det, gamma, lambda;
  det = (c - a) * (s - q) - (r - p) * (d - b);
  if (det === 0) {
    return false;
  } else {
    lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
    gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
};