var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-browser-library",
  ["nrtv-browser-bridge", "nrtv-tree", "nrtv-library"],
  function(BrowserBridge, Tree, Library) {

    function LibraryBridge() {

      var bridge = this.bridge = new BrowserBridge()

      if (!bridge) {
        throw new Error("You need to pass a bridge to browser-library: new LibraryBridge(bridge)")
      }

      var treeSingleton = bridge.defineSingleton("Tree", Tree.generateConstructor)

      var librarySingleton = bridge.defineSingleton(
        "Library",
        [treeSingleton],
        Library.generateConstructor
      )

      this.library = bridge.defineSingleton(
        "library",
        [librarySingleton],
        function(Library) {
          return new Library()
        }
      )
    }

    LibraryBridge.prototype.define =
      function() {

        var module

        for(var i=0; i<arguments.length; i++) {
          var arg = arguments[i]

          if (arg.__isNrtvLibraryModule) {

            module = new BoundModule(
              arg.name,
              arg.func,
              arg.dependencies,
              this.library.binding.identifier
            )
          } else if (typeof arg == "string") {
            var name = arg
          } else if (typeof arg == "function") {
            var func = arg
          } else if (Array.isArray(arg)) {
            var dependencies = arg
          }
        }

        if (!module) {
          module = new BoundModule(
            name,
            func,
            dependencies,
            this.library.binding.identifier
          )
        }

        this.bridge.asap(module.source())

        return module
      }

    // Maybe someday library knows something about modules that extend other modules?

    var methods = ["defineFunction", "asap", "sendPage"]

    methods.forEach(
      function(method) {
        LibraryBridge.prototype[method] =
          function() {
            return this.bridge[method].apply(this.bridge, arguments)
          }
      }
    )

    function BoundModule(name, func, dependencies, libraryKey) {
      this.name = name
      this.func = func
      this.dependencies = dependencies
      this.libraryKey = libraryKey
    }


    BoundModule.prototype.callable =
    BoundModule.prototype.evalable =
      function() {
        return this.libraryKey+".get(\""+this.name+"\")"
      }

    BoundModule.prototype.source =
      function() {
        return this.libraryKey+".define("+JSON.stringify(this.name)+", "+JSON.stringify(this.dependencies)+", "+this.func.toString()+")"        
      }

    return LibraryBridge
  }
)