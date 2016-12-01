Define modules with dependencies on a [browser bridge](https://github.com/erikpukinskis/browser-bridge):

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

var bridge = new BrowserBridge()

var cook = bridgeModule(library, "cook-dinner", bridge)

bridge.asap(
  cook.withArgs(["potato"])
)

site.addRoute("get", "/", bridge.sendPage())

site.start(8000)
```

If you are using nrtv-library for dependency on the resolution in your app already, you get a nice clean global scope:


```javascript
var library = require("nrtv-library")(require)

library.define(
  "cook-dinner",
  ["fire"],
  function(fire) {

    ...

  }
)

...

library.using(
  ["browser-bridge", "./", "web-site"],
  function(BrowserBridge, bridgeModule, site) {
    var bridge = new BrowserBridge()

    ...

    site.start(8000)
  }
)
```