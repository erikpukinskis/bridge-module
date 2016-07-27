var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-browser-library",
  ["nrtv-tree", "nrtv-library"],
  function(Tree, Library) {

    function bridgeModule(sourceLibrary, name, bridge) {

      var libraryBinding = getLibraryBinding(bridge)

      var moduleBinding = bridge.__nrtvModuleBindings[name]

      if (moduleBinding) { return moduleBinding }

      var module = sourceLibrary.modules[name]

      for(var i=0; i<module.dependencies.length; i++) {

        var depName = module.dependencies[i]

        bridgeModule(sourceLibrary, depName, bridge)
      }

      var moduleBinding =
        new BoundModule(
          module.name,
          module.func,
          module.dependencies,
          libraryBinding.binding.identifier
        )

      bridge.asap(moduleBinding.source())

      bridge.__nrtvModuleBindings[name] = moduleBinding

      return moduleBinding
    }


    function getLibraryBinding(bridge) {
      var binding = bridge.__libraryBinding

      if (binding) { return binding }

      var treeSingleton = bridge.defineSingleton("Tree", Tree.generator)

      var librarySingleton = bridge.defineSingleton(
        "Library",
        [treeSingleton],
        Library.generator
      )

      // This is exactly what the library bridge is for. Except in order to handle dependencies we need to handle some dependencies, so there is a bootstrapping problem.

      // So we just rely on tree and library to expose their generators, and we rely on those modules not having any other dependencies. We load those singletons by hand and then after that we can use the library to hook up dependencies.

      // generator maybe is the wrong word. this uses "definition function": https://addyosmani.com/writing-modular-js/ which is fairly literal. It's the function we use for defining the module.

      // Definition. Define. Yup. Definer? defineFunction? Eep, that's ambiguously a verb phrase too.

      var libraryBinding = bridge.defineSingleton(
        "library",
        [librarySingleton],
        function(Library) {
          return new Library()
        }
      )

      bridge.__nrtvModuleBindings = {}
      bridge.__nrtvLibraryBinding = libraryBinding.binding.identifier

      return libraryBinding
    }

    // Uh oh. This should be coming from function-call!!

    function BoundModule(name, func, dependencies, libraryKey) {
      if (!name) {
        throw new Error("where's the name?")
      }
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

    return bridgeModule
  }
)