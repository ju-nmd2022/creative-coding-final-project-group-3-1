const synth = new Tone.FMSynth().toDestination();

function setup() {
    createCanvas(windowWidth, windowHeight);
    Tone.start();
    background(0);
}

function draw() {
}

function mousePressed() {
    let pitch = map(mouseY, 0, height, 24, 72); 
    synth.triggerAttackRelease(Tone.Frequency(pitch, "midi").toNote(), "8n");

    fill(255);
    noStroke();
    ellipse(mouseX, mouseY, 20, 20);
}
