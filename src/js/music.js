function Music(name) {
  var audio = new Audio("music/" + name + ".mp3");

  this.play = function () {
    audio.loop = true;
    audio.volume = 0.05;
    audio.play();
  };
}

var music = new Music("music");
music.play();
