AFRAME.registerComponent('warn-on-layer-settings', {

  init: function() {

    var url_string = window.location.href;
    var url = new URL(url_string);
    var shapesLayers = url.searchParams.get("shapes");
    var arenaLayers = url.searchParams.get("arena");
    var shapesText = "";
    var arenaText = ""

    switch (shapesLayers) {
      case "0":
        shapesText = "Both eyes";
        break;

      case "1":
        shapesText = "Left eye only";
        break;

      case "2":
        shapesText = "Right eye only";
        break;

      default:
        shapesText = `Not visible (bad config: ${shapesLayers})`;
        break;
    }

    switch (arenaLayers) {
      case "0":
        arenaText = "Both eyes";
        break;

      case "1":
        arenaText = "Left eye only";
        break;

      case "2":
        arenaText = "Right eye only";
        break;

      default:
        arenaText = `Not visible (bad config: ${arenaLayers})`
        break;
    }

    if ((shapesLayers) || (arenaLayers)) {
      var text = "The URL you provided will display the game with non-standard settings.\n"
      text += `    Falling shape visibility: ${shapesText}    \n`
      text += `    Landed shape visibility: ${arenaText}    \n\n`
      text += "Playing the game with these settings may cause you visual discomfort. "
      text += "By clicking 'OK' you acknowledge that you are playing with these settings entirely at your own risk, that "
      text += "THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT and that "
      text += "IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n"
      text += "If you prefer to play with standard settings, please play at\n https://blockarcade.xyz"
      window.alert(text)
    }
  }
});
