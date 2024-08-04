AFRAME.registerComponent('hi-score-logger', {
  schema: {
    url:   {type: 'string', default: "https://tetrisland.pythonanywhere.com/hiscores"},
    game:  {type: 'string', default: ""},
    table: {type: 'selector', default: "#hiscores"}
  },

  init: function()
  {
    this.listeners = {
      'gameOver': this.gameOver.bind(this)
    }
    this.el.addEventListener("game-over", this.listeners.gameOver);
    this.sceneEl = document.querySelector('a-scene');
  },

  gameOver: function (event) {
    var isVR = (this.sceneEl.is('vr-mode')) ? 1 : 0;

    const data = {game: this.data.game,
                  score: event.detail.score,
                  level: event.detail.level,
                  gametime: event.detail.gametime,
                  vr: isVR};
    const jsonData = JSON.stringify(data);

    var request = new XMLHttpRequest();
    request.open('POST', this.data.url + "/submit" , true);
    request.setRequestHeader("Content-type", "application/json");
    request.send(jsonData);

    // Generate an event to the hi-score table to tell it to refresh.
    // (even if there's no high score, at least the games-played counter should
    // go up).
    this.data.table.emit("gameover", {gameId: this.data.game});
  }
});
