var library = require("module-library")(require)

module.exports = library.export(
  "bridge-module",
  ["string-tree", "module-library", "function-call"],
  function(Tree, Library, functionCall) {

    function bridgeModule(sourceLibrary, originalName, bridge, parent) {

      if (!bridge || !bridge.__isNrtvBrowserBridge) {
        throw new Error("The third argument of bridgeModule should be a bridge. You passed "+bridge)
      }

      if (!sourceLibrary.__isNrtvLibrary) {
        throw new Error("The first argument to bridgeModule needs to be a module-library. Add library.ref() as one of your dependencies and pass the singleton to bridgeModule.")
      }

      var libraryIdentifier = bridgeLibrary(bridge)

      var name = sourceLibrary.dealias(originalName)

      var moduleBinding = bridge.remember("bridge-module/bindings/"+name)

      if (moduleBinding) { return moduleBinding }

      functionCall.defineOn(bridge)

      var module = sourceLibrary.getModule(name)

      if (!module) {
        sourceLibrary.using([originalName], function() {})
        name = sourceLibrary.dealias(originalName)
        module = sourceLibrary.getModule(name)
      }

      var nonNrtvModule = !module && !!sourceLibrary.singletonCache[name]

      var modulePath = name
      if (parent) { modulePath += " < "+parent }

      if (nonNrtvModule) {
        throw new Error("You're trying to load the "+name+" module onto the bridge, but it looks like a regular CommonJS module. If you want to put a module on the client, you have to define it with module-library so we know about its dependencies. "+modulePath)
      }

      if (!module) {
        throw new Error(sourceLibrary.id+" does not seem to know about any so-called \""+name+"\" module. "+modulePath)
      }

      var deps = module.dependencies.map(sourceLibrary.dealias.bind(sourceLibrary))

      if (contains(deps, "bridge-module")) {
        var message = "Can't put "+name+" on the bridge, because it has its own dependecy on browser-bridge. Can you see the contradiction there?"
        throw new Error(message)
      }

      var func = module.func

      deps.forEach(function(dep) {
        if (dep == "browser-bridge") {
          throw new Error(modulePath+" wants us to load browser-bridge in the browser. Don't know how to do that yet.")
        }

        loadModule(sourceLibrary, dep, bridge, modulePath)
      })

      var getModule = functionCall(
        libraryIdentifier).singleton().methodCall("get").withArgs(name)

      var getterSource = getModule.evalable().replace(/\"/g, "'")

      var moduleBinding = functionCall(getterSource).singleton()

      if (parent) {
        var comment = "// "+name+" loaded as a dependency because "+parent
      } else {
        var comment = loadedComment()
      }
      bridge.asap(
        comment+"\n"+
        moduleSource(libraryIdentifier, name, deps, func)
      )

      bridge.see("bridge-module/bindings/"+name, moduleBinding)

      return moduleBinding
    }

    function loadModule(sourceLibrary, name, bridge, modulePath) {

      if (name.__dependencyType == 'self reference') {
        return 
      }

      bridgeModule(sourceLibrary, name, bridge, modulePath)
    }

    function loadedComment() {
      try {
        throw new Error("bridge-module induced this error for introspection purposes")
      } catch (e) {
        var origin = e.stack.split("\n")[3].substr(7)
        return "// module loaded from "+origin
      }
    }

    bridgeModule.definitionWithDeps = function(library, name, bridge) {

      var binding = bridgeModule(library, name, bridge)

      var bindings = bridge.remember("bridge-module/bindings")

      var deps = allDepsFor(name, bindings)

      return deps.map(toSource).join("\n\n")

      function toSource(dep) {
        var module = bindings[dep]

        return moduleSource(binding.libraryIdentifier, module.name, module.dependencies, module.func)
      }
    }

    function allDepsFor(name, bindings, all) {
      if (!all) { all = [] }
      if (contains(all, name)) { return }
      var binding = bindings[name]
      binding.dependencies.forEach(function(dep) {
        allDepsFor(dep, bindings, all)
      })
      all.push(name)
      return all
    }



    function bridgeLibrary(bridge) {

      var binding = bridge.remember("bridge-module/library")

      if (binding) { 
        return binding.identifier 
      }

      bridge.claimIdentifier("Tree")
      var treeSingleton = bridge.defineSingleton("Tree", Tree.generator)

      bridge.claimIdentifier("Library")
      var librarySingleton = bridge.defineSingleton(
        "Library",
        [treeSingleton],
        Library.generator
      )

      bridge.claimIdentifier("library")
      var libraryBinding = bridge.defineSingleton(
        "library",
        [librarySingleton],
        function(Library) {
          return new Library()
        }
      )

      bridge.see("bridge-module/library", libraryBinding)
      bridge.see("bridge-module/bindings", {})

      return libraryBinding.identifier
    }

    function moduleSource(libraryIdentifier, name, deps, func) {
      var source = libraryIdentifier

      source += ".define(\n  "+JSON.stringify(name)+",\n  "

      if (deps.length > 0) {
        source += JSON.stringify(deps)+",\n  "
      }
      source += func.toString()+"\n)"

      return source
    }

    function contains(array, value) {
      if (!Array.isArray(array)) {
        throw new Error("looking for "+JSON.stringify(value)+" in "+JSON.stringify(array)+", which is supposed to be an array. But it's not.")
      }
      var index = -1;
      var length = array.length;
      while (++index < length) {
        if (array[index] == value) {
          return true;
        }
      }
      return false;
    }

    return bridgeModule
  }
)