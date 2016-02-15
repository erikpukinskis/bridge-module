var test = require("nrtv-test")(require)
var library = test.library


test.using(
  "accessing the library from the browser",

  ["nrtv-server", "nrtv-browse", "nrtv-element", "./"],
  function(expect, done, Server, browse, element, LibraryBridge) {

    var bridge = new LibraryBridge()

    bridge.define(
    library.define(
      "hamburg",
      function hamburg() {
        return "bleu"
      }
    ))

    var withASneeze = bridge.define(
    library.define(
      "withASneeze",
      ["hamburg"],
      function fleur(hamburg) {
        return hamburg+" sneeze"
      }
    ))

    var sayIt = bridge.defineFunction(
      [withASneeze],
      function sayIt(sneeze) {
        document.querySelector("body").innerHTML = sneeze
      }
    )

    bridge.asap(sayIt)


    expect(sayIt.evalable()).to.equal(
      "sayIt(library.get(\"withASneeze\"))"
    )

    var server = new Server()

    server.get("/", bridge.sendPage())

    server.start(8282)

    library.using(
      ["withASneeze"],
      function(withASneeze) {
        expect(withASneeze).to.equal("bleu sneeze")

        browse("http://localhost:8282", runChecks)
      }
    )

    function runChecks(browser) {
      browser.assertText(
        "body", "bleu sneeze",
        server.stop,
        browser.done,
        done
      )
    }

  }
)



test.using(
  "add nrtv-library singletons as bridge modules",
  ["./", "nrtv-server", "nrtv-browse"],
  function(expect, done, LibraryBridge, Server, browse) {

    library.define(
      "elephantize",
      function() {
        function elephantize(name) {
          return name+" D. Elephant"
        }
        return elephantize
      }
    )

    var bridge = new LibraryBridge()

    library.using(
      ["elephantize"],
      function(elephantize) {

        var write = bridge.defineFunction(
          [bridge.define(elephantize)],
          function(elephantize) {
            document.querySelector("body").innerHTML = "I am "+elephantize("Erik")
          }
        )

        bridge.asap(write)

        var server = new Server()

        server.addRoute("get", "/", bridge.sendPage())

        server.start(3991)

        browse("http://localhost:3991",
          checkName)

        function checkName(browser) {
          browser.assertText(
            "body",
            "I am Erik D. Elephant",
            browser.done,
            server.stop,
            done
          )
        }

      }
    )


  }
)


