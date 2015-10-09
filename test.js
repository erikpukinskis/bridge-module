var test = require("nrtv-test")(require)
var library = require("nrtv-library")(require)

test.using(
  "accessing the library from the browser",

  [library.reset("nrtv-server"), "nrtv-browse", "nrtv-element", "./library-bridge"],
  function(expect, done, server, browse, element, LibraryBridge) {

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

    server.get("/", bridge.sendPage())

    server.start(8282)
    // return done()
    library.using(
      ["withASneeze"],
      function(withASneeze) {
        expect(withASneeze).to.equal("bleu sneeze")

        browse("http://localhost:8282", runChecks)
      }
    )

    function runChecks(browser) {
      browser.assert.text("body", "bleu sneeze")
      server.stop()
      done()
    }

  }
)
