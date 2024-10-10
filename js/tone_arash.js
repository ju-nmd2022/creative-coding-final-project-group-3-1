let strings = [];
let synth;
let walls = [];
let mazePatterns = [];
let scale;
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

  stroke(255); 
  strokeWeight(25);
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
    this.freq = random(scale); //random(200, 800); // pick a random note from the predefined scale
    this.synth = new Tone.AMSynth({
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.8,
        release: 0.5
      }
    }).toDestination();
    this.synth.triggerAttackRelease(this.freq, "8n"); // play the note only for an 8th note
    this.synth.oscillator.type = "sine"; // changing the synthesizer's oscillator type
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
    this.synth.triggerAttackRelease(this.freq, "8n"); // play the note only for an 8th note
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
  if(cursorState == "selecting"){
    for(let i = 0; i < strings.length; i++){
      if(strings[i].selected == true){
        if(strings[i].frozen == false){
          strings[i].velocity.x *= 0; // stop the horizontal movement of the string
          strings[i].velocity.y *= 0; // stop the vertical movement of the string
          // strings[i].synth.volume.value -= 10;
          strings[i].synth.triggerAttack(strings[i].freq); // when frozen, a string makes sound permanently
          strings[i].frozen = true;
        }else{
          strings[i].velocity.x = random(-2, 2);
          strings[i].velocity.y = random(-2, 2);
          strings[i].synth.volume.value = 1;
          strings[i].synth.triggerRelease();
          strings[i].frozen = false;
        }
        return;
      }
    }
  }
  else if(cursorState == "idle"){
    cursorState = "creating";
    // strings.push(new StringObj(mouseX, mouseY)); // previously we instantly created a string

    // but now, we start creating a line
    newLine = new Line(mouseX, mouseY);
  }
}

function mouseDragged(){
  if(cursorState == "creating"){
    newLine.endCoordinates.x = mouseX;
    newLine.endCoordinates.y = mouseY;
  }
}

function mouseReleased(){
  if(cursorState == "creating"){
    // calculate the rest of the properties by the line's speed, and start and end positions
    // newLine.length = dist(newLine.startCoordinates.x, newLine.startCoordinates.y, newLine.endCoordinates.x, newLine.endCoordinates.y);
    newLine.length = p5.Vector.dist(newLine.startCoordinates, newLine.endCoordinates);
    // console.log("L(" + newLine.length + ")");
    
    let numberOfSegments = Math.ceil(newLine.length / newLine.speed);
    if(numberOfSegments <= 1){
      newLine = null;
      cursorState = "idle";
      return;
    }
    // console.log("N(" + numberOfSegments + ")");
    newLine.velocity = p5.Vector.sub(newLine.endCoordinates, newLine.startCoordinates).normalize().mult(newLine.speed);
    // console.log("S(" + newLine.speed + ")");
    // console.log("V(" + newLine.velocity.x + ", " + newLine.velocity.y + ")");
    for(let i = 0; i < numberOfSegments; i++){
      newLine.segments[numberOfSegments - i] = createVector(
        newLine.endCoordinates.x - newLine.velocity.x * i,
        newLine.endCoordinates.y - newLine.velocity.y * i);
      // console.log("D(" + newLine.segments[numberOfSegments - i].x + ", " + newLine.segments[numberOfSegments - i].y + ")");
    }
    newLine.segments[0] = createVector(newLine.startCoordinates.x, newLine.startCoordinates.y);
    // console.log("D(" + newLine.segments[0].x + ", " + newLine.segments[0].y + ")");

    // create a new string based on the finished line
    let newString = new StringObj(newLine.endCoordinates.x, newLine.endCoordinates.y);
    newString.velocity = newLine.velocity;
    newString.speed = newLine.speed;
    newString.length = newLine.length;
    newString.thickness = newLine.thickness;
    newString.color = newLine.color;
    newString.segments = newLine.segments;
    strings.push(newString);

    // reset the temporary line cache variable
    newLine = null;
  }
  cursorState = "idle";
}

function keyPressed(){ // do something if a key on the keyboard is pressed
  if(keyCode === BACKSPACE){
    for(let i = 0; i < strings.length; i++){
      if(strings[i].selected == true){
        strings[i].synth.triggerRelease(); // when removing a string, stop the sound it is making
        strings.splice(i, 1); // remove the string altogether
        cursorState = "idle";
        return;
      }
    }
  }
  else if(keyCode === DELETE){ // if DELETE is pressed, remove all the strings
    strings.splice(0, strings.length);
  }
}

function checkForPinch(){
  let handsData = getHandsData();
  if(handsData != false){
    for(let i = 0; i < strings.length; i++){
      if(strings[i].selected == true && handsData.pinch <= 80){
        strings[i].velocity.x *= 0; // stop the horizontal movement of the string
        strings[i].velocity.y *= 0; // stop the vertical movement of the string
        // strings[i].synth.volume.value -= 10;
        strings[i].synth.triggerAttack(strings[i].freq); // when frozen, a string makes sound permanently
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