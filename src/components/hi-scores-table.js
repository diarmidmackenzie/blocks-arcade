
AFRAME.registerComponent('hi-scores-table', {
  schema: {
    url:   {type: 'string', default: "https://tetrisland.pythonanywhere.com/hiscores"},
    games:  {type: 'array', default: ""},
    names:  {type: 'array', default: ""},
    interval: {type: 'number', default: 10000},
    vrcontrols: {type: 'string', default: ""},
    keyboardcontrols: {type: 'string', default: ""}
  },

  init: function() {
    this.httpResponseFunction = this.dataCallback.bind(this);
    this.displayIndex = 0;
    this.inFocus = false;
    this.listeners = {
      focus: this.focus.bind(this),
      defocus: this.defocus.bind(this),
      next: this.next.bind(this),
      prev: this.prev.bind(this),
      gameover: this.gameover.bind(this),
    };
    this.sceneEl = document.querySelector('a-scene');
    this.jsonData = [];
    this.dataTimestamps = [];
    this.lastTickTime = 0;
    this.data.games.forEach(item => {
      this.jsonData.push("");
      this.dataTimestamps.push(-3600001);
    });
    this.queryIndex = 0;
    this.manualMove = false;
  },

  update: function() {

    if (this.displayIndex == this.data.games.length) {
      // Special case.  Display credits.
      this.showCredits();
    }
    else {
      if (this.lastTickTime - this.dataTimestamps[this.displayIndex] > 3600000)
      {
        // Data is over 60 mins old.  Refresh it.
        const gameId = this.data.games[this.displayIndex];
        const queryURL = `${this.data.url}/list?game=${gameId}&count=5`
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = this.httpResponseFunction;
        xmlHttp.open("GET", queryURL, true); // true for asynchronous
        xmlHttp.send(null);
        this.queryIndex = this.displayIndex;
      }
      else
      {
        this.presentData(this.jsonData[this.displayIndex]);
      }
    }
  },

  play: function () {
    this.attachEventListeners();
  },

  pause: function () {
    this.removeEventListeners();
  },

  remove: function () {
    this.pause();
  },

  tick: function(time, timeDelta) {

    var last_time = time - timeDelta;
    var remainderNow = time % (this.data.interval);
    var lastRemainder = last_time % (this.data.interval);

    if (remainderNow < lastRemainder) {
      // We just crossed a time interval.  So move to the next scoreboard.
      // unless the player moved to this screen in the last interval, in
      // which case leave it for one more interval before advancing.
      if (!this.manualMove) {
        this.lastTickTime = time;
        this.displayIndex++;
        if (this.displayIndex >= this.data.games.length) {
          this.displayIndex = 0;
        }
        this.update();
      }
      else
      {
        this.manualMove = false;
      }
    }
  },
  dataCallback: function (event) {

    if (event.target.readyState == 4 && event.target.status == 200) {

      const jsonData = JSON.parse(event.target.responseText);

      if (this.queryIndex == this.displayIndex) {
        // We are still waiting to present this data.
          this.presentData(jsonData);
      }
      else
      {
        // User has requested a different page already.
        this.update();
      }

      // In any case, store off the data we collected as fresh data.
      this.jsonData[this.queryIndex] = jsonData;
      this.dataTimestamps[this.queryIndex] = this.lastTickTime;
    }
  },

  showCredits: function() {
    var text = `Blocks Arcade developed by
                Diarmid Mackenzie using A-Frame.\n
                Background scene:
                "Psychedelica City Area One"
                by Bernd Kromueller.\n
                Music: "A New Year"
                by Scott Buckley.\n
                All code is open source on
                GitHub.  https://github.com/
                diarmidmackenzie/blocks-arcade\n
                Last updated: v0.2, 4 August 2024
                Comments and feedback welcome:
                 * Twitter/X: @blocksarcadeVR
                This game is free for everyone.
                Please share it!\n`
    text += this.pageFooter();

    this.el.setAttribute('text', "value: " + text);
  },

  presentData: function(jsonData) {

    var text = (this.data.names[this.displayIndex] == "") ?
                               "This game" : this.data.names[this.displayIndex];
    text += " has been played:\n"
    text += `${jsonData['today']['plays']} times today\n`
    text += `${jsonData['month']['plays']} times this month\n`
    text += `${jsonData['alltime']['plays']} times in all time\n`

    text += "\n=== High Scores this Month ===\n"
    text += this.showHiScoreTable(jsonData['month']['hiscores']);
    text += "\n==== All Time High Scores ====\n"
    text += this.showHiScoreTable(jsonData['alltime']['hiscores']);
    text += this.pageFooter();

    this.el.setAttribute('text', "value: " + text);
  },

  pageFooter: function() {
    var text = `\n(${this.displayIndex + 1}/${this.data.games.length + 1}) `;
    if (this.inFocus) {
      if (this.sceneEl.is('vr-mode')) {
        text += this.data.vrcontrols;
      }
      else
      {
        text += this.data.keyboardcontrols;
      }
    }

    return text;
  },

  showHiScoreTable: function(hiScoreData) {

    var text = ""
    if (hiScoreData.length > 0) {
        text += "Rank  Score  Level  Game Time\n"
        hiScoreData.forEach(function(item, index) {
          const score = item['score'].toString().padStart(5, " ")
          const level = item['level'].toString().padStart(5, " ")
          const mins = Math.floor(item['gametime'] / 60).toString().padStart(5, " ");
          const secs = (item['gametime'] % 60).toString().padStart('2', '0');

          text += `| ${(index + 1).toString().padStart('2', ' ')}  ${score}  ${level}  ${mins}:${secs} |\n`
        });
        for (var ii = hiScoreData.length ; ii < 5; ii++) {
          text += "\n"
        }
    }
    else
    {
      text += "No scores yet - be the first!\n\n\n\n\n\n"
    }
    return(text)
  },

  focus: function() {
    this.inFocus = true;

    this.presentData(this.jsonData[this.displayIndex]);
  },

  defocus: function() {
    this.inFocus = false;

    this.presentData(this.jsonData[this.displayIndex]);
  },

  next: function() {

    if (this.inFocus) {
      this.manualMove = true;
      this.displayIndex++;
      if (this.displayIndex > this.data.games.length) {
        this.displayIndex = 0;
      }

      this.update();
    }
  },

  prev: function() {
    if (this.inFocus) {
      this.manualMove = true;
      this.displayIndex--;
      if (this.displayIndex < 0) {
        this.displayIndex = this.data.games.length;
      }
      this.update();
    }
  },

  gameover: function(event) {

    var gameId = event.detail.gameId;
    var gameIndex = this.data.games.findIndex(x => (x == gameId));

    // Mark the data for this game as aged.
    this.dataTimestamps[gameIndex] = -3600001;

    // The query will happen next time this game's data is needed...
  },

  attachEventListeners: function () {

    this.el.addEventListener('focus', this.listeners.focus, false);
    this.el.addEventListener('defocus', this.listeners.defocus, false);
    this.el.addEventListener('next', this.listeners.next, false);
    this.el.addEventListener('prev', this.listeners.prev, false);
    this.el.addEventListener('gameover', this.listeners.gameover, false);
  },

  removeEventListeners: function () {

      this.el.removeEventListener('focus', this.listeners.focus);
      this.el.removeEventListener('defocus', this.listeners.defocus);
      this.el.removeEventListener('next', this.listeners.next);
      this.el.removeEventListener('prev', this.listeners.prev);
      this.el.removeEventListener('gemaover', this.listeners.gameover);
  }
});
