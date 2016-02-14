var test = require("nrtv-test")(require)
var library = require("nrtv-library")(require)

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
