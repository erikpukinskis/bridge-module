**bridge-module** lets you define modules with dependencies on a [browser bridge](https://github.com/erikpukinskis/browser-bridge):

```javascript
var BrowserBridge = require("browser-bridge")
var bridgeModule = require("bridge-module")
var site = require("web-site")

var library = require("module-library")(require)

library.define(
  "cook-dinner",
  ["fire"],
  function(fire) {

    function cook(ingredients) {
      fire.light()
      ingredients.map(fire.add)
    }

    return cook
  }
)

library.define(
  "fire",
  function() {
    function Fire() {}

    Fire.prototype.light = function() {
      console.log("WHOOSH")
    }

    Fire.prototype.add = function(item) {
      console.log("adding", item, "to fire")
    }

    return new Fire()
  }
)

library.using(
  ["cook-dinner", "bridge-module", "browser-bridge", "web-site"],
  function(cook, bridgeModule, BrowserBridge, site) {
    var bridge = new BrowserBridge()

    var cookInBrowser = bridgeModule(library, "cook-dinner", bridge)

    bridge.asap(
      cookInBrowser.withArgs(["potato"])
    )

    site.addRoute("get", "/", bridge.sendPage())

    site.start(8000)
  }
)

```
