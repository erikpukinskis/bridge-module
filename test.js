var library = require("nrtv-library")(require)
var runTest = require("run-test")(require)

runTest(
  "bind arguments to a singleton",
  ["./", "browser-bridge"],
  function(expect, done, bridgeModule, BrowserBridge) {

    library.define(
      "equivocate",
      function ummmm(something, bodyLanguage) {
        console.log("We are "+something+"ish")
        bodyLanguage()
      }
    )

    var bridge = new BrowserBridge()

    var grimmace = bridge.defineFunction(function grimmace() {
      cheeks.raise()
      eyes.squint()
      head.turn("slightly")
    })

    var equivocate = bridgeModule(library, "equivocate", bridge)

    var hunger = equivocate.withArgs("hungry", grimmace)

    expect(hunger.evalable()).to.equal(
      "library.get(\"equivocate\")(\"hungry\", grimmace)"
    )

    expect(hunger.callable()).to.equal(
      "library.get(\"equivocate\").bind(null, \"hungry\", grimmace)"
    )

    done()
  }
)


runTest(
  "accessing the library from the browser",

  ["browser-bridge", "web-site", "browser-task", "web-element", "./"],
  function(expect, done, BrowserBridge, WebSite, browserTask, element, bridgeModule) {

    library.define(
      "hamburg",
      function hamburg() {
        return "bleu"
      }
    )

    library.define(
      "withASneeze",
      ["hamburg"],
      function fleur(hamburg) {
        return hamburg+" sneeze"
      }
    )

    var bridge = new BrowserBridge()

    var withASneeze = bridgeModule(library, "withASneeze", bridge)

    var sayIt = bridge.defineFunction(
      [withASneeze],
      function sayIt(sneeze) {
        document.querySelector("body").innerHTML = sneeze
      }
    )

    bridge.asap(sayIt)


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
  ["./", "browser-bridge", "web-site", "browser-task"],
  function(expect, done, bridgeModule, BrowserBridge, WebSite, browserTask) {

    library.define(
      "elephantize",
      function() {
        function elephantize(name) {
          return name+" D. Elephant"
        }
        return elephantize
      }
    )

    var bridge = new BrowserBridge()

    var elephantizeInBrowser = bridgeModule(library, "elephantize", bridge)
    

    bridge.asap(
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


