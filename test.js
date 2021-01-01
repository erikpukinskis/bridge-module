var runTest = require("run-test")(require)
var library = runTest.library

runTest(
  "bind arguments to a singleton",
  [library.ref(), "./", "browser-bridge"],
  function(expect, done, lib, bridgeModule, BrowserBridge) {

    lib.library.define(
      "equivocate",
      function() {
        function ummmm(something, bodyLanguage) {
          console.log("We are "+something+"ish")
          bodyLanguage()
        }

        return ummmm
      }
    )

    var bridge = new BrowserBridge()

    var grimmace = bridge.defineFunction(function grimmace() {
      cheeks.raise()
      eyes.squint()
      head.turn("slightly")
    })

    var equivocate = bridgeModule(lib, "equivocate", bridge)

    var hunger = equivocate.withArgs("hungry", grimmace)

    expect(hunger.evalable()).to.equal(
      "library.get('equivocate')(\"hungry\", grimmace)"
    )

    expect(hunger.callable()).to.equal(
      "library.get('equivocate').bind(null, \"hungry\", grimmace)"
    )

    done()
  }
)


runTest(
  "accessing the library from the browser",

  [library.ref(), "browser-bridge", "web-site", "browser-task", "web-element", "./"],
  function(expect, done, lib, BrowserBridge, WebSite, browserTask, element, bridgeModule) {


    lib.library.define(
      "hamburg",
      function hamburg() {
        return "bleu"
      }
    )

    lib.library.define(
      "withASneeze",
      ["hamburg"],
      function fleur(hamburg) {
        return hamburg+" sneeze"
      }
    )


    var bridge = new BrowserBridge()

    debugger
    var withASneeze = bridgeModule(lib, "withASneeze", bridge)

    var sayIt = bridge.defineFunction(
      [withASneeze],
      function sayIt(sneeze) {
        document.querySelector("body").innerHTML = sneeze
      }
    )

    bridge.domReady(sayIt)


    expect(sayIt.evalable()).to.equal(
      "sayIt()"
    )

    var site = new WebSite()

    site.addRoute("get", "/", bridge.requestHandler())

    site.start(8282)

    library.using(
      ["withASneeze"],
      function(withASneeze) {
        expect(withASneeze).to.equal("bleu sneeze")

        browserTask("http://localhost:8282", runChecks)
      }
    )

    function runChecks(browser) {
      browser.assertText(
        "body", "bleu sneeze",
        site.stop,
        browser.done,
        done
      )
    }

  }
)



runTest(
  "add nrtv-library singletons as bridge modules",
  [library.ref(), "./", "browser-bridge", "web-site", "browser-task"],
  function(expect, done, lib, bridgeModule, BrowserBridge, WebSite, browserTask) {

    lib.library.define(
      "elephantize",
      function() {
        function elephantize(name) {
          return name+" D. Elephant"
        }
        return elephantize
      }
    )

    var bridge = new BrowserBridge()

    var elephantizeInBrowser = bridgeModule(lib, "elephantize", bridge)


    bridge.domReady(
      [elephantizeInBrowser],
      function(elephantize) {
        document.querySelector("body").innerHTML = "I am "+elephantize("Erik")
      }
    )

    var site = new WebSite()

    site.addRoute("get", "/", bridge.requestHandler())

    site.start(3991)

    browserTask("http://localhost:3991",
      checkName)

    function checkName(browser) {
      browser.assertText(
        "body",
        "I am Erik D. Elephant",
        browser.done,
        site.stop,
        done
      )
    }

  }
)


