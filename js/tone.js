let strings = [];
let synth;
let walls = [];
let mazePatterns = [];
let scale;
let notes = ["C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4"];
let masterVolume = 15;
let handPose;
let video;
let hands = [];
let cursorState = "idle"; // could be 'idle', 'selecting', or 'creating'
let newLine = null;

let pinch = 0;

function preload() {
  // Load the handPose model
  handPose = ml5.handPose({
    flipped: true,
  });
}

function setup() {
  createCanvas(windowHeight * 4 / 3, windowHeight);

  // Create the webcam video and hide it
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();
  // Start detecting hands from the webcam video
  handPose.detectStart(video, gotHands);

  background(0);
  Tone.start();
  scale = Tonal.Scale.get("C3 major").notes; // get the notes of a certain scale and put in the "scale" array
  defineMazePatterns();
  generateWalls();

  Tone.Master.volume.value = masterVolume; // changing the master volume (last link of the chain)

  setInterval(changeMazePattern, random(20000, 30000));
}

function draw() {
  let isSelecting = false;

  for(str of strings){
    isSelecting |= str.selected;
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
      break;
  }

  switch(cursorState){
    case "idle":
      background(0);
      break;
    case "selecting":
      background(220, 0, 0);
      break;
    case "creating":
      background(20);
      break;
  }

  // Draw the webcam video
  //image(video, 0, 0, width, height); // let's comment this out and not draw the video hehe

  for (let str of strings) {
    str.update();
    str.display();
  }

  if(newLine != null){
    newLine.display();
  }

  stroke(255, 0, 150); 
  strokeWeight(5);
  noFill();

  for (let wall of walls) {
    line(wall.x1, wall.y1, wall.x2, wall.y2);
  }

  drawThePinch();
  checkForPinch();
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

function drawThePinch(){
  let handsData = getHandsData();
  if(handsData != false){
    // This circle's size is controlled by a "pinch" gesture
    fill(0, 255, 0, 200);
    stroke(0);
    strokeWeight(2);
    circle(handsData.centerX, handsData.centerY, handsData.pinch);
  }
}

class Line{
  constructor(x, y){
    this.startCoordinates = createVector(x, y);
    this.endCoordinates = createVector(x, y);
    this.velocity = createVector(0, 0);
    this.speed = random(2, 4);
    this.length = 0;
    this.thickness = random(4, 12);
    this.color = color(random(255), random(255), random(255));
    this.segments = [];
  }

  display() {
    stroke(this.color);
    strokeWeight(this.thickness);
    noFill();
    
    // draw the line
    line(this.startCoordinates.x, this.startCoordinates.y, this.endCoordinates.x, this.endCoordinates.y);

    // draw the head of the new line
    fill(255);
    noStroke();
    let headRadius = this.thickness + 5;

    // make the head of the new line bigger and distinguishable
    ellipse(this.endCoordinates.x, this.endCoordinates.y, headRadius);
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
    this.frozen = false;

    // this.freq = random(scale); //random(200, 800); // pick a random note from the predefined scale
    // this.synth = new Tone.AMSynth({
    //   envelope: {
    //     attack: 0.1,
    //     decay: 0.2,
    //     sustain: 0.8,
    //     release: 0.5
    //   }
    // }).toDestination();
    // this.synth.triggerAttackRelease(this.freq, "8n"); // play the note only for an 8th note
    // this.synth.oscillator.type = "sine"; // changing the synthesizer's oscillator type

    this.note = random(notes);
    this.sampler = new Tone.Sampler({
      urls: {
        C4: "C4.mp3",
        D4: "Ds4.mp3",
        F4: "Fs4.mp3",
        A4: "A4.mp3",
      },
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      release: 1,
      onload: () => console.log('Sampler loaded')
    }).toDestination();

    Tone.loaded().then(() => {
      this.sampler.triggerAttackRelease(this.note, '8n');
    });
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
      let lineLength = dist(wall.x1, wall.y1, wall.x2, wall.y2);
      let distanceFromWall = dist(this.position.x, this.position.y, wall.x1, wall.y1) + dist(this.position.x, this.position.y, wall.x2, wall.y2);
    
      if (Math.abs(distanceFromWall - lineLength) < 0.4) {
        let normalX = (wall.y2 - wall.y1) / lineLength;
        let normalY = (wall.x1 - wall.x2) / lineLength;
        
        let dotProduct = this.velocity.x * normalX + this.velocity.y * normalY;
        
        this.velocity.x -= 2 * dotProduct * normalX;
        this.velocity.y -= 2 * dotProduct * normalY;
    
        this.playBounceTone();
      }
    }
    
    
    if(!this.frozen){ // move the string only if it is not frozen
      this.segments.push(this.position.copy());
      // console.log("segments: " + this.segments.length + " speed: " + this.speed + " length: " + this.length);
      
      while (this.segments.length * this.speed > this.length) {
        this.segments.shift();
      }
    }

    if(dist(mouseX, mouseY, this.position.x, this.position.y) <= 20) // check if the mouse pointer is near the head
    {
      this.selected = true;
    }
    else 
    {
      this.selected = false;
    }

    let handsData = getHandsData();
    if(handsData != false){
      if((dist(handsData.centerX, handsData.centerY, this.position.x, this.position.y) <= 80) && handsData.pinch <= 160)
        this.selected = true;
      else
        this.selected = false;
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

    // draw the head of the string
    fill(255);
    noStroke();
    let headRadius = this.thickness;

    // if the mouse is on the head of the string, make it bigger and distinguishable
    headRadius += this.selected == true? 10 : 0;
    ellipse(this.segments[this.segments.length - 1].x, this.segments[this.segments.length - 1].y, headRadius);
    
    push();
    translate(this.segments[this.segments.length - 1].x, this.segments[this.segments.length - 1].y);
    rotate(Math.atan(this.velocity.y / this.velocity.x));
    // make the eyes
    ellipse(0, -10, 20);
    ellipse(0, 10, 20);
    // make the black of the eyes
    strokeWeight(1);
    stroke(255);
    fill(0);
    ellipse(5, -10, 14);
    ellipse(5, 10, 14);
    // make the spark in the eyes
    fill(255);
    ellipse(0, -10, 8);
    ellipse(0, 10, 8);
    pop();
  }

  playBounceTone() {
    // this.freq = random(scale); //random(200, 800); // pick a random note from the predefined scale
    // this.synth.set({ frequency: this.freq });

    // this.synth.triggerAttackRelease(this.freq, "8n"); // play the note only for an 8th note

    this.sampler.triggerAttackRelease(this.note, '8n');
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
    walls.push(wall);
  }
}

function mousePressed() {
  if (cursorState == "selecting") {
    for (let i = 0; i < strings.length; i++) {
      if (strings[i].selected) {
        strings[i].frozen = !strings[i].frozen;
        if (strings[i].frozen) {
          strings[i].velocity.set(0, 0);

          // strings[i].synth.triggerAttack(strings[i].freq);

          strings[i].sampler.triggerAttack(strings[i].note);
        } else {
          strings[i].velocity.set(random(-2, 2), random(-2, 2));

          // strings[i].synth.triggerRelease();

          strings[i].sampler.triggerRelease();
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

function mouseDragged(){
  if(cursorState == "creating"){
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

        // strings[i].synth.triggerRelease(); // when removing a string, stop the sound it is making

        strings[i].sampler.triggerRelease();

        strings.splice(i, 1); // remove the string altogether
        cursorState = "idle";
        return;
      }
    }
  }
  else if(keyCode === DELETE){ // if DELETE is pressed, remove all the strings
    for(string of strings){
      string.sampler.triggerRelease();
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

function checkForPinch(){
  let handsData = getHandsData();
  if(handsData != false){
    for(let i = 0; i < strings.length; i++){
      if(strings[i].selected == true && handsData.pinch <= 80){
        strings[i].velocity.x *= 0; // stop the horizontal movement of the string
        strings[i].velocity.y *= 0; // stop the vertical movement of the string
        // strings[i].synth.volume.value -= 10;

        // strings[i].synth.triggerAttack(strings[i].freq); // when frozen, a string makes sound permanently

        strings[i].sampler.triggerAttack(strings[i].note);

        strings[i].frozen = true;
      }
    }
  }
}

// Callback function for when handPose outputs data
function gotHands(results) {
  // Save the output to the hands variable
  hands = results;
}